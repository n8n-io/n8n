const stringWidth = require('string-width');

function codeRegex(capture) {
  return capture ? /\u001b\[((?:\d*;){0,5}\d*)m/g : /\u001b\[(?:\d*;){0,5}\d*m/g;
}

function strlen(str) {
  let code = codeRegex();
  let stripped = ('' + str).replace(code, '');
  let split = stripped.split('\n');
  return split.reduce(function (memo, s) {
    return stringWidth(s) > memo ? stringWidth(s) : memo;
  }, 0);
}

function repeat(str, times) {
  return Array(times + 1).join(str);
}

function pad(str, len, pad, dir) {
  let length = strlen(str);
  if (len + 1 >= length) {
    let padlen = len - length;
    switch (dir) {
      case 'right': {
        str = repeat(pad, padlen) + str;
        break;
      }
      case 'center': {
        let right = Math.ceil(padlen / 2);
        let left = padlen - right;
        str = repeat(pad, left) + str + repeat(pad, right);
        break;
      }
      default: {
        str = str + repeat(pad, padlen);
        break;
      }
    }
  }
  return str;
}

let codeCache = {};

function addToCodeCache(name, on, off) {
  on = '\u001b[' + on + 'm';
  off = '\u001b[' + off + 'm';
  codeCache[on] = { set: name, to: true };
  codeCache[off] = { set: name, to: false };
  codeCache[name] = { on: on, off: off };
}

//https://github.com/Marak/colors.js/blob/master/lib/styles.js
addToCodeCache('bold', 1, 22);
addToCodeCache('italics', 3, 23);
addToCodeCache('underline', 4, 24);
addToCodeCache('inverse', 7, 27);
addToCodeCache('strikethrough', 9, 29);

function updateState(state, controlChars) {
  let controlCode = controlChars[1] ? parseInt(controlChars[1].split(';')[0]) : 0;
  if ((controlCode >= 30 && controlCode <= 39) || (controlCode >= 90 && controlCode <= 97)) {
    state.lastForegroundAdded = controlChars[0];
    return;
  }
  if ((controlCode >= 40 && controlCode <= 49) || (controlCode >= 100 && controlCode <= 107)) {
    state.lastBackgroundAdded = controlChars[0];
    return;
  }
  if (controlCode === 0) {
    for (let i in state) {
      /* istanbul ignore else */
      if (Object.prototype.hasOwnProperty.call(state, i)) {
        delete state[i];
      }
    }
    return;
  }
  let info = codeCache[controlChars[0]];
  if (info) {
    state[info.set] = info.to;
  }
}

function readState(line) {
  let code = codeRegex(true);
  let controlChars = code.exec(line);
  let state = {};
  while (controlChars !== null) {
    updateState(state, controlChars);
    controlChars = code.exec(line);
  }
  return state;
}

function unwindState(state, ret) {
  let lastBackgroundAdded = state.lastBackgroundAdded;
  let lastForegroundAdded = state.lastForegroundAdded;

  delete state.lastBackgroundAdded;
  delete state.lastForegroundAdded;

  Object.keys(state).forEach(function (key) {
    if (state[key]) {
      ret += codeCache[key].off;
    }
  });

  if (lastBackgroundAdded && lastBackgroundAdded != '\u001b[49m') {
    ret += '\u001b[49m';
  }
  if (lastForegroundAdded && lastForegroundAdded != '\u001b[39m') {
    ret += '\u001b[39m';
  }

  return ret;
}

function rewindState(state, ret) {
  let lastBackgroundAdded = state.lastBackgroundAdded;
  let lastForegroundAdded = state.lastForegroundAdded;

  delete state.lastBackgroundAdded;
  delete state.lastForegroundAdded;

  Object.keys(state).forEach(function (key) {
    if (state[key]) {
      ret = codeCache[key].on + ret;
    }
  });

  if (lastBackgroundAdded && lastBackgroundAdded != '\u001b[49m') {
    ret = lastBackgroundAdded + ret;
  }
  if (lastForegroundAdded && lastForegroundAdded != '\u001b[39m') {
    ret = lastForegroundAdded + ret;
  }

  return ret;
}

function truncateWidth(str, desiredLength) {
  if (str.length === strlen(str)) {
    return str.substr(0, desiredLength);
  }

  while (strlen(str) > desiredLength) {
    str = str.slice(0, -1);
  }

  return str;
}

function truncateWidthWithAnsi(str, desiredLength) {
  let code = codeRegex(true);
  let split = str.split(codeRegex());
  let splitIndex = 0;
  let retLen = 0;
  let ret = '';
  let myArray;
  let state = {};

  while (retLen < desiredLength) {
    myArray = code.exec(str);
    let toAdd = split[splitIndex];
    splitIndex++;
    if (retLen + strlen(toAdd) > desiredLength) {
      toAdd = truncateWidth(toAdd, desiredLength - retLen);
    }
    ret += toAdd;
    retLen += strlen(toAdd);

    if (retLen < desiredLength) {
      if (!myArray) {
        break;
      } // full-width chars may cause a whitespace which cannot be filled
      ret += myArray[0];
      updateState(state, myArray);
    }
  }

  return unwindState(state, ret);
}

function truncate(str, desiredLength, truncateChar) {
  truncateChar = truncateChar || '…';
  let lengthOfStr = strlen(str);
  if (lengthOfStr <= desiredLength) {
    return str;
  }
  desiredLength -= strlen(truncateChar);

  let ret = truncateWidthWithAnsi(str, desiredLength);

  ret += truncateChar;

  const hrefTag = '\x1B]8;;\x07';

  if (str.includes(hrefTag) && !ret.includes(hrefTag)) {
    ret += hrefTag;
  }

  return ret;
}

function defaultOptions() {
  return {
    chars: {
      top: '─',
      'top-mid': '┬',
      'top-left': '┌',
      'top-right': '┐',
      bottom: '─',
      'bottom-mid': '┴',
      'bottom-left': '└',
      'bottom-right': '┘',
      left: '│',
      'left-mid': '├',
      mid: '─',
      'mid-mid': '┼',
      right: '│',
      'right-mid': '┤',
      middle: '│',
    },
    truncate: '…',
    colWidths: [],
    rowHeights: [],
    colAligns: [],
    rowAligns: [],
    style: {
      'padding-left': 1,
      'padding-right': 1,
      head: ['red'],
      border: ['grey'],
      compact: false,
    },
    head: [],
  };
}

function mergeOptions(options, defaults) {
  options = options || {};
  defaults = defaults || defaultOptions();
  let ret = Object.assign({}, defaults, options);
  ret.chars = Object.assign({}, defaults.chars, options.chars);
  ret.style = Object.assign({}, defaults.style, options.style);
  return ret;
}

// Wrap on word boundary
function wordWrap(maxLength, input) {
  let lines = [];
  let split = input.split(/(\s+)/g);
  let line = [];
  let lineLength = 0;
  let whitespace;
  for (let i = 0; i < split.length; i += 2) {
    let word = split[i];
    let newLength = lineLength + strlen(word);
    if (lineLength > 0 && whitespace) {
      newLength += whitespace.length;
    }
    if (newLength > maxLength) {
      if (lineLength !== 0) {
        lines.push(line.join(''));
      }
      line = [word];
      lineLength = strlen(word);
    } else {
      line.push(whitespace || '', word);
      lineLength = newLength;
    }
    whitespace = split[i + 1];
  }
  if (lineLength) {
    lines.push(line.join(''));
  }
  return lines;
}

// Wrap text (ignoring word boundaries)
function textWrap(maxLength, input) {
  let lines = [];
  let line = '';
  function pushLine(str, ws) {
    if (line.length && ws) line += ws;
    line += str;
    while (line.length > maxLength) {
      lines.push(line.slice(0, maxLength));
      line = line.slice(maxLength);
    }
  }
  let split = input.split(/(\s+)/g);
  for (let i = 0; i < split.length; i += 2) {
    pushLine(split[i], i && split[i - 1]);
  }
  if (line.length) lines.push(line);
  return lines;
}

function multiLineWordWrap(maxLength, input, wrapOnWordBoundary = true) {
  let output = [];
  input = input.split('\n');
  const handler = wrapOnWordBoundary ? wordWrap : textWrap;
  for (let i = 0; i < input.length; i++) {
    output.push.apply(output, handler(maxLength, input[i]));
  }
  return output;
}

function colorizeLines(input) {
  let state = {};
  let output = [];
  for (let i = 0; i < input.length; i++) {
    let line = rewindState(state, input[i]);
    state = readState(line);
    let temp = Object.assign({}, state);
    output.push(unwindState(temp, line));
  }
  return output;
}

/**
 * Credit: Matheus Sampaio https://github.com/matheussampaio
 */
function hyperlink(url, text) {
  const OSC = '\u001B]';
  const BEL = '\u0007';
  const SEP = ';';

  return [OSC, '8', SEP, SEP, url || text, BEL, text, OSC, '8', SEP, SEP, BEL].join('');
}

module.exports = {
  strlen: strlen,
  repeat: repeat,
  pad: pad,
  truncate: truncate,
  mergeOptions: mergeOptions,
  wordWrap: multiLineWordWrap,
  colorizeLines: colorizeLines,
  hyperlink,
};
