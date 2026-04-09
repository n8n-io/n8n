var protobuf = require("protobufjs");
var path = require("path");

// Constants
var BUILDKIT_TRACE_ID = "moby.buildkit.trace";
var BUILDKIT_IMAGE_ID = "moby.image.id";
var PROTO_TYPE = "moby.buildkit.v1.StatusResponse";
var ENCODING_UTF8 = "utf8";
var ENCODING_BASE64 = "base64";

var StatusResponse;

// Load the protobuf schema
function loadProto() {
  if (StatusResponse) return StatusResponse;
  
  var root = protobuf.loadSync(
    path.resolve(__dirname, "proto", "buildkit_status.proto")
  );
  StatusResponse = root.lookupType(PROTO_TYPE);
  return StatusResponse;
}

/**
 * Decodes a BuildKit trace message
 * @param {string} base64Data - Base64-encoded protobuf data from aux field
 * @returns {Object} Decoded status response with vertexes, logs, etc.
 */
function decodeBuildKitStatus(base64Data) {
  var StatusResponse = loadProto();
  
  // Handle empty messages
  if (!base64Data || base64Data.length === 0) {
    return {
      vertexes: [],
      statuses: [],
      logs: [],
      warnings: []
    };
  }
  
  var buffer = Buffer.from(base64Data, ENCODING_BASE64);
  var message = StatusResponse.decode(buffer);
  return StatusResponse.toObject(message, {
    longs: String,
    enums: String,
    bytes: String,
    defaults: true
  });
}

/**
 * Formats BuildKit status into human-readable text
 * @param {Object} status - Decoded status response
 * @returns {string[]} Array of human-readable log lines
 */
function formatBuildKitStatus(status) {
  var lines = [];
  
  // Process vertexes (build steps)
  if (status.vertexes && status.vertexes.length > 0) {
    status.vertexes.forEach(function(vertex) {
      if (vertex.name && vertex.started && !vertex.completed) {
        lines.push("[" + vertex.digest.substring(0, 12) + "] " + vertex.name);
      }
      if (vertex.error) {
        lines.push("ERROR: " + vertex.error);
      }
      if (vertex.completed && vertex.cached) {
        lines.push("CACHED: " + vertex.name);
      }
    });
  }
  
  // Process logs (command output)
  if (status.logs && status.logs.length > 0) {
    status.logs.forEach(function(log) {
      var msg = Buffer.from(log.msg).toString(ENCODING_UTF8);
      if (msg.trim()) {
        lines.push(msg.trimEnd());
      }
    });
  }
  
  // Process status updates (progress)
  if (status.statuses && status.statuses.length > 0) {
    status.statuses.forEach(function(s) {
      if (s.name && s.total > 0) {
        var percent = Math.floor((s.current / s.total) * 100);
        lines.push(s.name + ": " + percent + "% (" + s.current + "/" + s.total + ")");
      }
    });
  }
  
  // Process warnings
  if (status.warnings && status.warnings.length > 0) {
    status.warnings.forEach(function(warning) {
      var msg = Buffer.from(warning.short).toString(ENCODING_UTF8);
      lines.push("WARNING: " + msg);
    });
  }
  
  return lines;
}

/**
 * Parse a BuildKit stream line and extract human-readable logs
 * @param {string} line - JSON line from build stream
 * @returns {Object} { isBuildKit: boolean, logs: string[], raw: Object }
 */
function parseBuildKitLine(line) {
  try {
    var json = JSON.parse(line);
    
    // Check if it's a BuildKit trace message
    if (json.id === BUILDKIT_TRACE_ID && json.aux !== undefined) {
      var status = decodeBuildKitStatus(json.aux);
      var logs = formatBuildKitStatus(status);
      
      return {
        isBuildKit: true,
        logs: logs,
        raw: status
      };
    }
    
    // Check if it's the final image ID
    if (json.id === BUILDKIT_IMAGE_ID && json.aux && json.aux.ID) {
      return {
        isBuildKit: true,
        logs: ["Built image: " + json.aux.ID],
        raw: json.aux
      };
    }
    
    // Not a BuildKit message
    return {
      isBuildKit: false,
      logs: [],
      raw: json
    };
  } catch (e) {
    return {
      isBuildKit: false,
      logs: [],
      raw: null,
      error: e.message
    };
  }
}

/**
 * Follow progress of a stream, automatically handling both BuildKit and regular output.
 * This provides the same ergonomics as modem.followProgress but decodes BuildKit logs.
 * 
 * @param {Stream} stream - Stream from buildImage(), pull(), push(), etc.
 * @param {Function} onFinished - Called when stream ends: (err, output) => void
 * @param {Function} onProgress - Called for each log event: (event) => void
 * @returns {void}
 */
function followProgress(stream, onFinished, onProgress) {
  var buffer = '';
  var output = [];
  var finished = false;

  stream.on('data', onStreamEvent);
  stream.on('error', onStreamError);
  stream.on('end', onStreamEnd);
  stream.on('close', onStreamEnd);

  function onStreamEvent(data) {
    buffer += data.toString();
    
    // Process complete lines
    var lines = buffer.split('\n');
    buffer = lines.pop(); // Save incomplete line
    
    lines.forEach(function(line) {
      if (!line.trim()) return;
      
      processLine(line);
    });
  }

  function processLine(line) {
    try {
      // Try to parse as BuildKit or regular Docker output
      var result = parseBuildKitLine(line);
      
      if (result.isBuildKit) {
        // BuildKit message - create events from decoded logs
        result.logs.forEach(function(log) {
          var event = { stream: log + '\n' };
          output.push(event);
          if (onProgress) onProgress(event);
        });
      } else if (result.raw) {
        // Regular Docker message
        output.push(result.raw);
        if (onProgress) onProgress(result.raw);
      }
    } catch (e) {
      // If parsing fails, try plain JSON
      try {
        var json = JSON.parse(line);
        output.push(json);
        if (onProgress) onProgress(json);
      } catch (e2) {
        // Ignore parse errors
      }
    }
  }

  function onStreamError(err) {
    finished = true;
    stream.removeListener('data', onStreamEvent);
    stream.removeListener('error', onStreamError);
    stream.removeListener('end', onStreamEnd);
    stream.removeListener('close', onStreamEnd);
    if (onFinished) onFinished(err, output);
  }

  function onStreamEnd() {
    if (finished) return;
    finished = true;
    
    // Process any remaining data in buffer
    if (buffer.trim()) {
      processLine(buffer);
    }
    
    stream.removeListener('data', onStreamEvent);
    stream.removeListener('error', onStreamError);
    stream.removeListener('end', onStreamEnd);
    stream.removeListener('close', onStreamEnd);
    if (onFinished) onFinished(null, output);
  }
}

module.exports = {
  followProgress: followProgress
};
