Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const constants = require('./constants.js');

/**
 * Check if a method path should be instrumented
 */
function shouldInstrument(methodPath) {
  // Check for exact matches first (like 'models.generateContent')
  if (constants.GOOGLE_GENAI_INSTRUMENTED_METHODS.includes(methodPath )) {
    return true;
  }

  // Check for method name matches (like 'sendMessage' from chat instances)
  const methodName = methodPath.split('.').pop();
  return constants.GOOGLE_GENAI_INSTRUMENTED_METHODS.includes(methodName );
}

/**
 * Check if a method is a streaming method
 */
function isStreamingMethod(methodPath) {
  return methodPath.includes('Stream');
}

// Copied from https://googleapis.github.io/js-genai/release_docs/index.html

/**
 *
 */
function contentUnionToMessages(content, role = 'user') {
  if (typeof content === 'string') {
    return [{ role, content }];
  }
  if (Array.isArray(content)) {
    return content.flatMap(content => contentUnionToMessages(content, role));
  }
  if (typeof content !== 'object' || !content) return [];
  if ('role' in content && typeof content.role === 'string') {
    return [content ];
  }
  if ('parts' in content) {
    return [{ ...content, role } ];
  }
  return [{ role, content }];
}

exports.contentUnionToMessages = contentUnionToMessages;
exports.isStreamingMethod = isStreamingMethod;
exports.shouldInstrument = shouldInstrument;
//# sourceMappingURL=utils.js.map
