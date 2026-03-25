import { workerData } from 'node:worker_threads';
import { getEnvelopeEndpointWithUrlEncodedAuth, uuid4, Scope, mergeScopeData, createEventEnvelope, makeSession, updateSession, createSessionEnvelope, applyScopeDataToEvent, generateSpanId, normalizeUrlToBase, stripSentryFramesAndReverse, filenameIsInApp } from '@sentry/core';
import { makeNodeTransport } from '@sentry/node';
import { getThreadsLastSeen, captureStackTrace } from '@sentry-internal/node-native-stacktrace';
import { POLL_RATIO } from './common.js';

const {
  threshold,
  appRootPath,
  contexts,
  debug,
  dist,
  dsn,
  environment,
  maxEventsPerHour,
  release,
  sdkMetadata,
  staticTags: tags,
  tunnel,
} = workerData ;

const pollInterval = threshold / POLL_RATIO;
const triggeredThreads = new Set();

function log(...msg) {
  if (debug) {
    // eslint-disable-next-line no-console
    console.log('[Sentry Event Loop Blocked Watchdog]', ...msg);
  }
}

function createRateLimiter(maxEventsPerHour) {
  let currentHour = 0;
  let currentCount = 0;

  return function isRateLimited() {
    const hour = new Date().getHours();

    if (hour !== currentHour) {
      currentHour = hour;
      currentCount = 0;
    }

    if (currentCount >= maxEventsPerHour) {
      if (currentCount === maxEventsPerHour) {
        currentCount += 1;
        log(`Rate limit reached: ${currentCount} events in this hour`);
      }
      return true;
    }

    currentCount += 1;
    return false;
  };
}

const url = getEnvelopeEndpointWithUrlEncodedAuth(dsn, tunnel, sdkMetadata.sdk);
const transport = makeNodeTransport({
  url,
  recordDroppedEvent: () => {
    //
  },
});
const isRateLimited = createRateLimiter(maxEventsPerHour);

async function sendAbnormalSession(serializedSession) {
  if (!serializedSession) {
    return;
  }

  log('Sending abnormal session');
  const session = makeSession(serializedSession);

  updateSession(session, {
    status: 'abnormal',
    abnormal_mechanism: 'anr_foreground',
    release,
    environment,
  });

  const envelope = createSessionEnvelope(session, dsn, sdkMetadata, tunnel);
  // Log the envelope so to aid in testing
  log(JSON.stringify(envelope));

  await transport.send(envelope);
}

log('Started');

function prepareStackFrames(stackFrames) {
  if (!stackFrames) {
    return undefined;
  }

  // Strip Sentry frames and reverse the stack frames so they are in the correct order
  const strippedFrames = stripSentryFramesAndReverse(stackFrames);

  for (const frame of strippedFrames) {
    if (!frame.filename) {
      continue;
    }

    frame.in_app = filenameIsInApp(frame.filename);

    // If we have an app root path, rewrite the filenames to be relative to the app root
    if (appRootPath) {
      frame.filename = normalizeUrlToBase(frame.filename, appRootPath);
    }
  }

  return strippedFrames;
}

function stripFileProtocol(filename) {
  if (!filename) {
    return undefined;
  }
  return filename.replace(/^file:\/\//, '');
}

// eslint-disable-next-line complexity
function applyDebugMeta(event, debugImages) {
  if (Object.keys(debugImages).length === 0) {
    return;
  }

  const normalisedDebugImages = appRootPath ? {} : debugImages;
  if (appRootPath) {
    for (const [path, debugId] of Object.entries(debugImages)) {
      normalisedDebugImages[normalizeUrlToBase(path, appRootPath)] = debugId;
    }
  }

  const filenameToDebugId = new Map();

  for (const exception of event.exception?.values || []) {
    for (const frame of exception.stacktrace?.frames || []) {
      const filename = stripFileProtocol(frame.abs_path || frame.filename);
      if (filename && normalisedDebugImages[filename]) {
        filenameToDebugId.set(filename, normalisedDebugImages[filename]);
      }
    }
  }

  for (const thread of event.threads?.values || []) {
    for (const frame of thread.stacktrace?.frames || []) {
      const filename = stripFileProtocol(frame.abs_path || frame.filename);
      if (filename && normalisedDebugImages[filename]) {
        filenameToDebugId.set(filename, normalisedDebugImages[filename]);
      }
    }
  }

  if (filenameToDebugId.size > 0) {
    const images = [];
    for (const [code_file, debug_id] of filenameToDebugId.entries()) {
      images.push({
        type: 'sourcemap',
        code_file,
        debug_id,
      });
    }
    event.debug_meta = { images };
  }
}

function getExceptionAndThreads(
  crashedThreadId,
  threads,
) {
  const crashedThread = threads[crashedThreadId];

  return {
    exception: {
      values: [
        {
          type: 'EventLoopBlocked',
          value: `Event Loop Blocked for at least ${threshold} ms`,
          stacktrace: { frames: prepareStackFrames(crashedThread?.frames) },
          // This ensures the UI doesn't say 'Crashed in' for the stack trace
          mechanism: { type: 'ANR' },
          thread_id: crashedThreadId,
        },
      ],
    },
    threads: {
      values: Object.entries(threads).map(([threadId, threadState]) => {
        const crashed = threadId === crashedThreadId;

        const thread = {
          id: threadId,
          name: threadId === '0' ? 'main' : `worker-${threadId}`,
          crashed,
          current: true,
          main: threadId === '0',
        };

        if (!crashed) {
          thread.stacktrace = { frames: prepareStackFrames(threadState.frames) };
        }

        return thread;
      }),
    },
  };
}

function applyScopeToEvent(event, scope) {
  applyScopeDataToEvent(event, scope);

  if (!event.contexts?.trace) {
    const { traceId, parentSpanId, propagationSpanId } = scope.propagationContext;
    event.contexts = {
      trace: {
        trace_id: traceId,
        span_id: propagationSpanId || generateSpanId(),
        parent_span_id: parentSpanId,
      },
      ...event.contexts,
    };
  }
}

async function sendBlockEvent(crashedThreadId) {
  if (isRateLimited()) {
    return;
  }

  const threads = captureStackTrace();
  const crashedThread = threads[crashedThreadId];

  if (!crashedThread) {
    log(`No thread found with ID '${crashedThreadId}'`);
    return;
  }

  try {
    await sendAbnormalSession(crashedThread.pollState?.session);
  } catch (error) {
    log(`Failed to send abnormal session for thread '${crashedThreadId}':`, error);
  }

  log('Sending event');

  const event = {
    event_id: uuid4(),
    contexts,
    release,
    environment,
    dist,
    platform: 'node',
    level: 'error',
    tags,
    ...getExceptionAndThreads(crashedThreadId, threads),
  };

  const asyncState = threads[crashedThreadId]?.asyncState;
  if (asyncState) {
    // We need to rehydrate the scopes from the serialized objects so we can call getScopeData()
    const scope = Object.assign(new Scope(), asyncState.scope).getScopeData();
    const isolationScope = Object.assign(new Scope(), asyncState.isolationScope).getScopeData();
    mergeScopeData(scope, isolationScope);
    applyScopeToEvent(event, scope);
  }

  const allDebugImages = Object.values(threads).reduce((acc, threadState) => {
    return { ...acc, ...threadState.pollState?.debugImages };
  }, {});

  applyDebugMeta(event, allDebugImages);

  const envelope = createEventEnvelope(event, dsn, sdkMetadata, tunnel);
  // Log the envelope to aid in testing
  log(JSON.stringify(envelope));

  await transport.send(envelope);
  await transport.flush(2000);
}

setInterval(async () => {
  for (const [threadId, time] of Object.entries(getThreadsLastSeen())) {
    if (time > threshold) {
      if (triggeredThreads.has(threadId)) {
        continue;
      }

      log(`Blocked thread detected '${threadId}' last polled ${time} ms ago.`);
      triggeredThreads.add(threadId);

      try {
        await sendBlockEvent(threadId);
      } catch (error) {
        log(`Failed to send event for thread '${threadId}':`, error);
      }
    } else {
      triggeredThreads.delete(threadId);
    }
  }
}, pollInterval);
//# sourceMappingURL=event-loop-block-watchdog.js.map
