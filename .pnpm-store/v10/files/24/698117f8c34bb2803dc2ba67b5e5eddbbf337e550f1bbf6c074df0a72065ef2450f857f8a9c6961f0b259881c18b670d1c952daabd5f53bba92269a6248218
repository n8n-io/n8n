import LinesAndColumns from "lines-and-columns";


import {formatTokenType} from "../parser/tokenizer/types";

export default function formatTokens(code, tokens) {
  if (tokens.length === 0) {
    return "";
  }

  const tokenKeys = Object.keys(tokens[0]).filter(
    (k) => k !== "type" && k !== "value" && k !== "start" && k !== "end" && k !== "loc",
  );
  const typeKeys = Object.keys(tokens[0].type).filter((k) => k !== "label" && k !== "keyword");

  const headings = ["Location", "Label", "Raw", ...tokenKeys, ...typeKeys];

  const lines = new LinesAndColumns(code);
  const rows = [headings, ...tokens.map(getTokenComponents)];
  const padding = headings.map(() => 0);
  for (const components of rows) {
    for (let i = 0; i < components.length; i++) {
      padding[i] = Math.max(padding[i], components[i].length);
    }
  }
  return rows
    .map((components) => components.map((component, i) => component.padEnd(padding[i])).join(" "))
    .join("\n");

  function getTokenComponents(token) {
    const raw = code.slice(token.start, token.end);
    return [
      formatRange(token.start, token.end),
      formatTokenType(token.type),
      truncate(String(raw), 14),
      // @ts-ignore: Intentional dynamic access by key.
      ...tokenKeys.map((key) => formatValue(token[key], key)),
      // @ts-ignore: Intentional dynamic access by key.
      ...typeKeys.map((key) => formatValue(token.type[key], key)),
    ];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function formatValue(value, key) {
    if (value === true) {
      return key;
    } else if (value === false || value === null) {
      return "";
    } else {
      return String(value);
    }
  }

  function formatRange(start, end) {
    return `${formatPos(start)}-${formatPos(end)}`;
  }

  function formatPos(pos) {
    const location = lines.locationForIndex(pos);
    if (!location) {
      return "Unknown";
    } else {
      return `${location.line + 1}:${location.column + 1}`;
    }
  }
}

function truncate(s, length) {
  if (s.length > length) {
    return `${s.slice(0, length - 3)}...`;
  } else {
    return s;
  }
}
