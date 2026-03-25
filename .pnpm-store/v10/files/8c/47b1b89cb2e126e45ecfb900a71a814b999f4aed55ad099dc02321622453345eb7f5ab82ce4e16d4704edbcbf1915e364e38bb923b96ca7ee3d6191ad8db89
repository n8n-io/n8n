"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.convertTimestampToArray = convertTimestampToArray;
exports.createEvent = createEvent;
exports.createEvents = createEvents;

var _nanoid = require("nanoid");

var _pipeline = require("./pipeline");

function assignUniqueId(event) {
  event.uid = event.uid || (0, _nanoid.nanoid)();
  return event;
}

function validateAndBuildEvent(event) {
  return (0, _pipeline.validateEvent)((0, _pipeline.buildEvent)(event));
}

function applyInitialFormatting(_ref) {
  var error = _ref.error,
      value = _ref.value;

  if (error) {
    return {
      error: error,
      value: null
    };
  }

  return {
    error: null,
    value: (0, _pipeline.formatEvent)(value)
  };
}

function reformatEventsByPosition(_ref2, idx, list) {
  var error = _ref2.error,
      value = _ref2.value;
  if (error) return {
    error: error,
    value: value
  };

  if (idx === 0) {
    // beginning of list
    return {
      value: value.slice(0, value.indexOf('END:VCALENDAR')),
      error: null
    };
  }

  if (idx === list.length - 1) {
    // end of list
    return {
      value: value.slice(value.indexOf('BEGIN:VEVENT')),
      error: null
    };
  }

  return {
    error: null,
    value: value.slice(value.indexOf('BEGIN:VEVENT'), value.indexOf('END:VEVENT') + 12)
  };
}

function catenateEvents(accumulator, _ref3, idx) {
  var error = _ref3.error,
      value = _ref3.value;

  if (error) {
    accumulator.error = error;
    accumulator.value = null;
    return accumulator;
  }

  if (accumulator.value) {
    accumulator.value = accumulator.value.concat(value);
    return accumulator;
  }

  accumulator.value = value;
  return accumulator;
}

function convertTimestampToArray(timestamp) {
  var inputType = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'local';
  var dateArray = [];
  var d = new Date(timestamp);
  dateArray.push(inputType === 'local' ? d.getFullYear() : d.getUTCFullYear());
  dateArray.push((inputType === 'local' ? d.getMonth() : d.getUTCMonth()) + 1);
  dateArray.push(inputType === 'local' ? d.getDate() : d.getUTCDate());
  dateArray.push(inputType === 'local' ? d.getHours() : d.getUTCHours());
  dateArray.push(inputType === 'local' ? d.getMinutes() : d.getUTCMinutes());
  return dateArray;
}

function createEvent(attributes, cb) {
  if (!attributes) {
    Error('Attributes argument is required');
  }

  assignUniqueId(attributes);

  if (!cb) {
    // No callback, so return error or value in an object
    var _validateAndBuildEven = validateAndBuildEvent(attributes),
        _error = _validateAndBuildEven.error,
        _value = _validateAndBuildEven.value;

    if (_error) return {
      error: _error,
      value: _value
    };
    var event = '';

    try {
      event = (0, _pipeline.formatEvent)(_value);
    } catch (error) {
      return {
        error: error,
        value: null
      };
    }

    return {
      error: null,
      value: event
    };
  } // Return a node-style callback


  var _validateAndBuildEven2 = validateAndBuildEvent(attributes),
      error = _validateAndBuildEven2.error,
      value = _validateAndBuildEven2.value;

  if (error) return cb(error);
  return cb(null, (0, _pipeline.formatEvent)(value));
}

function createEvents(events, cb) {
  if (!events) {
    return {
      error: Error('one argument is required'),
      value: null
    };
  }

  if (events.length === 1) {
    return createEvent(events[0], cb);
  }

  var _events$map$map$map$m = events.map(assignUniqueId).map(validateAndBuildEvent).map(applyInitialFormatting).map(reformatEventsByPosition).reduce(catenateEvents, {
    error: null,
    value: null
  }),
      error = _events$map$map$map$m.error,
      value = _events$map$map$map$m.value;

  if (!cb) {
    return {
      error: error,
      value: value
    };
  }

  return cb(error, value);
}