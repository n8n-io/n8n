import { normalizeStackTracePath } from './stacktrace.js';
import { GLOBAL_OBJ } from './worldwide.js';

let parsedStackResults;
let lastSentryKeysCount;
let lastNativeKeysCount;
let cachedFilenameDebugIds;

/**
 * Returns a map of filenames to debug identifiers.
 * Supports both proprietary _sentryDebugIds and native _debugIds (e.g., from Vercel) formats.
 */
function getFilenameToDebugIdMap(stackParser) {
  const sentryDebugIdMap = GLOBAL_OBJ._sentryDebugIds;
  const nativeDebugIdMap = GLOBAL_OBJ._debugIds;

  if (!sentryDebugIdMap && !nativeDebugIdMap) {
    return {};
  }

  const sentryDebugIdKeys = sentryDebugIdMap ? Object.keys(sentryDebugIdMap) : [];
  const nativeDebugIdKeys = nativeDebugIdMap ? Object.keys(nativeDebugIdMap) : [];

  // If the count of registered globals hasn't changed since the last call, we
  // can just return the cached result.
  if (
    cachedFilenameDebugIds &&
    sentryDebugIdKeys.length === lastSentryKeysCount &&
    nativeDebugIdKeys.length === lastNativeKeysCount
  ) {
    return cachedFilenameDebugIds;
  }

  lastSentryKeysCount = sentryDebugIdKeys.length;
  lastNativeKeysCount = nativeDebugIdKeys.length;

  // Build a map of filename -> debug_id from both sources
  cachedFilenameDebugIds = {};

  if (!parsedStackResults) {
    parsedStackResults = {};
  }

  const processDebugIds = (debugIdKeys, debugIdMap) => {
    for (const key of debugIdKeys) {
      const debugId = debugIdMap[key];
      const result = parsedStackResults?.[key];

      if (result && cachedFilenameDebugIds && debugId) {
        // Use cached filename but update with current debug ID
        cachedFilenameDebugIds[result[0]] = debugId;
        // Update cached result with new debug ID
        if (parsedStackResults) {
          parsedStackResults[key] = [result[0], debugId];
        }
      } else if (debugId) {
        const parsedStack = stackParser(key);

        for (let i = parsedStack.length - 1; i >= 0; i--) {
          const stackFrame = parsedStack[i];
          const filename = stackFrame?.filename;

          if (filename && cachedFilenameDebugIds && parsedStackResults) {
            cachedFilenameDebugIds[filename] = debugId;
            parsedStackResults[key] = [filename, debugId];
            break;
          }
        }
      }
    }
  };

  if (sentryDebugIdMap) {
    processDebugIds(sentryDebugIdKeys, sentryDebugIdMap);
  }

  // Native _debugIds will override _sentryDebugIds if same file
  if (nativeDebugIdMap) {
    processDebugIds(nativeDebugIdKeys, nativeDebugIdMap);
  }

  return cachedFilenameDebugIds;
}

/**
 * Returns a list of debug images for the given resources.
 */
function getDebugImagesForResources(
  stackParser,
  resource_paths,
) {
  const filenameDebugIdMap = getFilenameToDebugIdMap(stackParser);

  if (!filenameDebugIdMap) {
    return [];
  }

  const images = [];
  for (const path of resource_paths) {
    const normalizedPath = normalizeStackTracePath(path);
    if (normalizedPath && filenameDebugIdMap[normalizedPath]) {
      images.push({
        type: 'sourcemap',
        code_file: path,
        debug_id: filenameDebugIdMap[normalizedPath],
      });
    }
  }

  return images;
}

export { getDebugImagesForResources, getFilenameToDebugIdMap };
//# sourceMappingURL=debug-ids.js.map
