import { getEmojiSequenceFromString, getUnqualifiedEmojiSequence } from '../cleanup.mjs';
import { getEmojiSequenceKeyword } from '../format.mjs';
import '../convert.mjs';
import '../data.mjs';

const componentStatus = "component";
const allowedStatus = /* @__PURE__ */ new Set([
  componentStatus,
  "fully-qualified",
  "minimally-qualified",
  "unqualified"
]);
function getQualifiedTestData(data) {
  const results = /* @__PURE__ */ Object.create(null);
  for (const key in data) {
    const item = data[key];
    const sequence = getUnqualifiedEmojiSequence(item.sequence);
    const shortKey = getEmojiSequenceKeyword(sequence);
    if (!results[shortKey] || results[shortKey].sequence.length < sequence.length) {
      results[shortKey] = item;
    }
  }
  return results;
}
function parseEmojiTestFile(data) {
  const results = /* @__PURE__ */ Object.create(null);
  let group;
  let subgroup;
  data.split("\n").forEach((line) => {
    line = line.trim();
    const parts = line.split("#");
    if (parts.length < 2) {
      return;
    }
    const firstChunk = parts.shift().trim();
    const secondChunk = parts.join("#").trim();
    if (!firstChunk) {
      const commentParts = secondChunk.split(":");
      if (commentParts.length === 2) {
        const key2 = commentParts[0].trim();
        const value = commentParts[1].trim();
        switch (key2) {
          case "group":
            group = value;
            subgroup = void 0;
            break;
          case "subgroup":
            subgroup = value;
            break;
        }
      }
      return;
    }
    if (!group || !subgroup) {
      return;
    }
    const firstChunkParts = firstChunk.split(";");
    if (firstChunkParts.length !== 2) {
      return;
    }
    const code = firstChunkParts[0].trim();
    if (!code || !code.match(/^[A-F0-9]+[A-F0-9\s]*[A-F0-9]+$/)) {
      return;
    }
    const status = firstChunkParts[1].trim();
    if (!allowedStatus.has(status)) {
      throw new Error(`Bad emoji type: ${status}`);
    }
    const secondChunkParts = secondChunk.split(/\s+/);
    if (secondChunkParts.length < 3) {
      throw new Error(`Bad emoji comment for: ${code}`);
    }
    const emoji = secondChunkParts.shift();
    const version = secondChunkParts.shift();
    if (version.slice(0, 1) !== "E") {
      throw new Error(`Bad unicode version "${version}" for: ${code}`);
    }
    const name = secondChunkParts.join(" ");
    const sequence = getEmojiSequenceFromString(code);
    const key = getEmojiSequenceKeyword(sequence);
    if (results[key]) {
      throw new Error(`Duplicate entry for "${code}"`);
    }
    results[key] = {
      group,
      subgroup,
      sequence,
      emoji,
      status,
      version,
      name
    };
  });
  return getQualifiedTestData(results);
}

export { componentStatus, parseEmojiTestFile };
