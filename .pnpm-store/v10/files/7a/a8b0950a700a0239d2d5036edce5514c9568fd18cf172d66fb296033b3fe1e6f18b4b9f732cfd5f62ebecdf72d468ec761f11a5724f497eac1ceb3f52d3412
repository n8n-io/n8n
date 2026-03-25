import { GLOBAL_OBJ } from './utils/worldwide.js';

/** Keys are source filename/url, values are metadata objects. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const filenameMetadataMap = new Map();
/** Set of stack strings that have already been parsed. */
const parsedStacks = new Set();

/**
 * Builds a map of filenames to module metadata from the global _sentryModuleMetadata object.
 * This is useful for forwarding metadata from web workers to the main thread.
 *
 * @param parser - Stack parser to use for extracting filenames from stack traces
 * @returns A map of filename to metadata object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getFilenameToMetadataMap(parser) {
  if (!GLOBAL_OBJ._sentryModuleMetadata) {
    return {};
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filenameMap = {};

  for (const stack of Object.keys(GLOBAL_OBJ._sentryModuleMetadata)) {
    const metadata = GLOBAL_OBJ._sentryModuleMetadata[stack];
    const frames = parser(stack);

    for (const frame of frames.reverse()) {
      if (frame.filename) {
        filenameMap[frame.filename] = metadata;
        break;
      }
    }
  }

  return filenameMap;
}

function ensureMetadataStacksAreParsed(parser) {
  if (!GLOBAL_OBJ._sentryModuleMetadata) {
    return;
  }

  for (const stack of Object.keys(GLOBAL_OBJ._sentryModuleMetadata)) {
    const metadata = GLOBAL_OBJ._sentryModuleMetadata[stack];

    if (parsedStacks.has(stack)) {
      continue;
    }

    // Ensure this stack doesn't get parsed again
    parsedStacks.add(stack);

    const frames = parser(stack);

    // Go through the frames starting from the top of the stack and find the first one with a filename
    for (const frame of frames.reverse()) {
      if (frame.filename) {
        // Save the metadata for this filename
        filenameMetadataMap.set(frame.filename, metadata);
        break;
      }
    }
  }
}

/**
 * Retrieve metadata for a specific JavaScript file URL.
 *
 * Metadata is injected by the Sentry bundler plugins using the `_experiments.moduleMetadata` config option.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMetadataForUrl(parser, filename) {
  ensureMetadataStacksAreParsed(parser);
  return filenameMetadataMap.get(filename);
}

/**
 * Adds metadata to stack frames.
 *
 * Metadata is injected by the Sentry bundler plugins using the `_experiments.moduleMetadata` config option.
 */
function addMetadataToStackFrames(parser, event) {
  event.exception?.values?.forEach(exception => {
    exception.stacktrace?.frames?.forEach(frame => {
      if (!frame.filename || frame.module_metadata) {
        return;
      }

      const metadata = getMetadataForUrl(parser, frame.filename);

      if (metadata) {
        frame.module_metadata = metadata;
      }
    });
  });
}

/**
 * Strips metadata from stack frames.
 */
function stripMetadataFromStackFrames(event) {
  event.exception?.values?.forEach(exception => {
    exception.stacktrace?.frames?.forEach(frame => {
      delete frame.module_metadata;
    });
  });
}

export { addMetadataToStackFrames, getFilenameToMetadataMap, getMetadataForUrl, stripMetadataFromStackFrames };
//# sourceMappingURL=metadata.js.map
