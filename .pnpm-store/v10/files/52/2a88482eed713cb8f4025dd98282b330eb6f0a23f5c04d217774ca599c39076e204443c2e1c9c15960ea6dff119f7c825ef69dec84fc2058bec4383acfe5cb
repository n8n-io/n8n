// src/utils/accept.ts
var isWhitespace = (char) => char === 32 || char === 9 || char === 10 || char === 13;
var consumeWhitespace = (acceptHeader, startIndex) => {
  while (startIndex < acceptHeader.length) {
    if (!isWhitespace(acceptHeader.charCodeAt(startIndex))) {
      break;
    }
    startIndex++;
  }
  return startIndex;
};
var ignoreTrailingWhitespace = (acceptHeader, startIndex) => {
  while (startIndex > 0) {
    if (!isWhitespace(acceptHeader.charCodeAt(startIndex - 1))) {
      break;
    }
    startIndex--;
  }
  return startIndex;
};
var skipInvalidParam = (acceptHeader, startIndex) => {
  while (startIndex < acceptHeader.length) {
    const char = acceptHeader.charCodeAt(startIndex);
    if (char === 59) {
      return [startIndex + 1, true];
    }
    if (char === 44) {
      return [startIndex + 1, false];
    }
    startIndex++;
  }
  return [startIndex, false];
};
var skipInvalidAcceptValue = (acceptHeader, startIndex) => {
  let i = startIndex;
  let inQuotes = false;
  while (i < acceptHeader.length) {
    const char = acceptHeader.charCodeAt(i);
    if (inQuotes && char === 92) {
      i++;
    } else if (char === 34) {
      inQuotes = !inQuotes;
    } else if (!inQuotes && char === 44) {
      return i + 1;
    }
    i++;
  }
  return i;
};
var getNextParam = (acceptHeader, startIndex) => {
  startIndex = consumeWhitespace(acceptHeader, startIndex);
  let i = startIndex;
  let key;
  let value;
  let hasNext = false;
  while (i < acceptHeader.length) {
    const char = acceptHeader.charCodeAt(i);
    if (char === 61) {
      key = acceptHeader.slice(startIndex, ignoreTrailingWhitespace(acceptHeader, i));
      i++;
      break;
    }
    if (char === 59) {
      return [i + 1, void 0, void 0, true];
    }
    if (char === 44) {
      return [i + 1, void 0, void 0, false];
    }
    i++;
  }
  if (key === void 0) {
    return [i, void 0, void 0, false];
  }
  i = consumeWhitespace(acceptHeader, i);
  if (acceptHeader.charCodeAt(i) === 61) {
    const skipResult = skipInvalidParam(acceptHeader, i + 1);
    return [skipResult[0], key, void 0, skipResult[1]];
  }
  let inQuotes = false;
  const paramStartIndex = i;
  while (i < acceptHeader.length) {
    const char = acceptHeader.charCodeAt(i);
    if (inQuotes && char === 92) {
      i++;
    } else if (char === 34) {
      if (inQuotes) {
        let nextIndex = consumeWhitespace(acceptHeader, i + 1);
        const nextChar = acceptHeader.charCodeAt(nextIndex);
        if (nextIndex < acceptHeader.length && !(nextChar === 59 || nextChar === 44)) {
          const skipResult = skipInvalidParam(acceptHeader, nextIndex);
          return [skipResult[0], key, void 0, skipResult[1]];
        }
        value = acceptHeader.slice(paramStartIndex + 1, i);
        if (value.includes("\\")) {
          value = value.replace(/\\(.)/g, "$1");
        }
        if (nextChar === 44) {
          return [nextIndex + 1, key, value, false];
        }
        if (nextChar === 59) {
          hasNext = true;
          nextIndex++;
        }
        i = nextIndex;
        break;
      }
      inQuotes = true;
    } else if (!inQuotes && (char === 59 || char === 44)) {
      value = acceptHeader.slice(paramStartIndex, ignoreTrailingWhitespace(acceptHeader, i));
      if (char === 59) {
        hasNext = true;
      }
      i++;
      break;
    }
    i++;
  }
  return [
    i,
    key,
    value ?? acceptHeader.slice(paramStartIndex, ignoreTrailingWhitespace(acceptHeader, i)),
    hasNext
  ];
};
var getNextAcceptValue = (acceptHeader, startIndex) => {
  const accept = {
    type: "",
    params: {},
    q: 1
  };
  startIndex = consumeWhitespace(acceptHeader, startIndex);
  let i = startIndex;
  while (i < acceptHeader.length) {
    const char = acceptHeader.charCodeAt(i);
    if (char === 59 || char === 44) {
      accept.type = acceptHeader.slice(startIndex, ignoreTrailingWhitespace(acceptHeader, i));
      i++;
      if (char === 44) {
        return [i, accept.type ? accept : void 0];
      }
      if (!accept.type) {
        return [skipInvalidAcceptValue(acceptHeader, i), void 0];
      }
      break;
    }
    i++;
  }
  if (!accept.type) {
    accept.type = acceptHeader.slice(
      startIndex,
      ignoreTrailingWhitespace(acceptHeader, acceptHeader.length)
    );
    return [acceptHeader.length, accept.type ? accept : void 0];
  }
  let param;
  let value;
  let hasNext;
  while (i < acceptHeader.length) {
    ;
    [i, param, value, hasNext] = getNextParam(acceptHeader, i);
    if (param && value) {
      accept.params[param] = value;
    }
    if (!hasNext) {
      break;
    }
  }
  return [i, accept];
};
var parseAccept = (acceptHeader) => {
  if (!acceptHeader) {
    return [];
  }
  const values = [];
  let i = 0;
  let accept;
  let requiresSort = false;
  let lastAccept;
  while (i < acceptHeader.length) {
    ;
    [i, accept] = getNextAcceptValue(acceptHeader, i);
    if (accept) {
      accept.q = parseQuality(accept.params.q);
      values.push(accept);
      if (lastAccept && lastAccept.q < accept.q) {
        requiresSort = true;
      }
      lastAccept = accept;
    }
  }
  if (requiresSort) {
    values.sort((a, b) => b.q - a.q);
  }
  return values;
};
var parseQuality = (qVal) => {
  if (qVal === void 0) {
    return 1;
  }
  if (qVal === "") {
    return 1;
  }
  if (qVal === "NaN") {
    return 0;
  }
  const num = Number(qVal);
  if (num === Infinity) {
    return 1;
  }
  if (num === -Infinity) {
    return 0;
  }
  if (Number.isNaN(num)) {
    return 1;
  }
  if (num < 0 || num > 1) {
    return 1;
  }
  return num;
};
export {
  parseAccept
};
