import { minUTF32, startUTF32Pair1, startUTF32Pair2, endUTF32Pair } from './data.mjs';

function getEmojiCodePoint(code) {
  return parseInt(code, 16);
}
function utf32FirstNum(code) {
  return (code - minUTF32 >> 10 | 0) + startUTF32Pair1;
}
function utf32SecondNum(code) {
  return (code - minUTF32 & 1023) + startUTF32Pair2;
}
function splitUTF32Number(code) {
  if (code >= minUTF32) {
    return [utf32FirstNum(code), utf32SecondNum(code)];
  }
}
function isUTF32SplitNumber(value) {
  if (value >= startUTF32Pair1) {
    if (value < startUTF32Pair2) {
      return 1;
    }
    if (value < endUTF32Pair) {
      return 2;
    }
  }
  return false;
}
function mergeUTF32Numbers(part1, part2) {
  if (part1 < startUTF32Pair1 || part1 >= startUTF32Pair2 || part2 < startUTF32Pair2 || part2 >= endUTF32Pair) {
    return;
  }
  return (part1 - startUTF32Pair1 << 10) + (part2 - startUTF32Pair2) + minUTF32;
}
function getEmojiUnicode(code) {
  return String.fromCodePoint(
    typeof code === "number" ? code : getEmojiCodePoint(code)
  );
}
function convertEmojiSequenceToUTF16(numbers) {
  const results = [];
  for (let i = 0; i < numbers.length; i++) {
    const code = numbers[i];
    if (code >= minUTF32) {
      results.push(utf32FirstNum(code));
      results.push(utf32SecondNum(code));
    } else {
      results.push(code);
    }
  }
  return results;
}
function convertEmojiSequenceToUTF32(numbers, throwOnError = true) {
  const results = [];
  for (let i = 0; i < numbers.length; i++) {
    const code = numbers[i];
    if (code >= minUTF32) {
      results.push(code);
      continue;
    }
    const part = isUTF32SplitNumber(code);
    if (!part) {
      results.push(code);
      continue;
    }
    if (part === 1 && numbers.length > i + 1) {
      const merged = mergeUTF32Numbers(code, numbers[i + 1]);
      if (merged) {
        i++;
        results.push(merged);
        continue;
      }
    }
    if (throwOnError) {
      const nextCode = numbers[i + 1];
      throw new Error(
        `Invalid UTF-16 sequence: ${code.toString(16)}-${nextCode ? nextCode.toString(16) : "undefined"}`
      );
    }
    results.push(code);
  }
  return results;
}

export { convertEmojiSequenceToUTF16, convertEmojiSequenceToUTF32, getEmojiCodePoint, getEmojiUnicode, isUTF32SplitNumber, mergeUTF32Numbers, splitUTF32Number };
