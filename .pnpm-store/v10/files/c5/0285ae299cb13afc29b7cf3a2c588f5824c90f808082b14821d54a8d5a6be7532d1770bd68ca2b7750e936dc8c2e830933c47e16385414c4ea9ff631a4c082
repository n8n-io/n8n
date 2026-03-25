var Hack = require('./hack');

var Marker = require('../tokenizer/marker');

var ASTERISK_HACK = '*';
var BACKSLASH_HACK = '\\';
var IMPORTANT_TOKEN = '!important';
var UNDERSCORE_HACK = '_';
var BANG_HACK = '!ie';

function restoreFromOptimizing(properties, restoreCallback) {
  var property;
  var restored;
  var current;
  var i;

  for (i = properties.length - 1; i >= 0; i--) {
    property = properties[i];

    if (property.unused) {
      continue;
    }

    if (!property.dirty && !property.important && !property.hack) {
      continue;
    }

    if (restoreCallback) {
      restored = restoreCallback(property);
      property.value = restored;
    } else {
      restored = property.value;
    }

    if (property.important) {
      restoreImportant(property);
    }

    if (property.hack) {
      restoreHack(property);
    }

    if ('all' in property) {
      current = property.all[property.position];
      current[1][1] = property.name;

      current.splice(2, current.length - 1);
      Array.prototype.push.apply(current, restored);
    }
  }
}

function restoreImportant(property) {
  property.value[property.value.length - 1][1] += IMPORTANT_TOKEN;
}

function restoreHack(property) {
  if (property.hack[0] == Hack.UNDERSCORE) {
    property.name = UNDERSCORE_HACK + property.name;
  } else if (property.hack[0] == Hack.ASTERISK) {
    property.name = ASTERISK_HACK + property.name;
  } else if (property.hack[0] == Hack.BACKSLASH) {
    property.value[property.value.length - 1][1] += BACKSLASH_HACK + property.hack[1];
  } else if (property.hack[0] == Hack.BANG) {
    property.value[property.value.length - 1][1] += Marker.SPACE + BANG_HACK;
  }
}

module.exports = restoreFromOptimizing;
