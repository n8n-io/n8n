import { CCError } from "../utils.js";
import type { Warnings } from "../Warnings.js";
import { Token, Word, eq } from "../shell/Word.js";
import { SrcFormParam } from "../curl/opts.js";

// contentFile is the actual file to read from
export type Details = {
  contentType?: Word;
  // name of the filename= to send to the server, if one needs to be sent
  filename?: Word;
  // binary, 8bit, 7bit, base64, or quoted-printable
  encoder?: Word;
  // extra headers or files to read extra headers from
  headers?: Word[];
  headerFiles?: Word[];
};

export type FormParamPrototype = {
  name: Word;
  content?: Word; // actually mandatory
  contentFile?: Word; // .content can be renamed to .contentFile later
} & Details;

export type FormParam = {
  name: Word;
} & ({ content: Word } | { contentFile: Word }) &
  Details;

export type Supported = {
  filename?: boolean;
  encoder?: boolean;
  headers?: boolean;
};

function parseDetails(
  formParam: FormParamPrototype,
  p: Word,
  ptr: number,
  supported: Supported,
  warnings: Warnings,
): FormParamPrototype {
  while (ptr < p.length && p.charAt(ptr) === ";") {
    ptr += 1;
    while (ptr < p.length && isSpace(p.charAt(ptr))) {
      ptr += 1;
    }
    if (ptr >= p.length) {
      return formParam;
    }

    const value = p.slice(ptr);
    if (value.startsWith("type=")) {
      // TODO: the syntax for type= is more complicated
      [formParam.contentType, ptr] = getParamWord(p, ptr + 5, warnings);
    } else if (value.startsWith("filename=")) {
      const [filename, filenameEnd] = getParamWord(p, ptr + 9, warnings);
      ptr = filenameEnd;
      if (supported.filename) {
        formParam.filename = filename;
      } else {
        warnings.push([
          "unsupported-form-detail",
          "Field file name not allowed here: " + filename.toString(),
        ]);
      }
    } else if (value.startsWith("encoder=")) {
      const [encoder, encoderEnd] = getParamWord(p, ptr + 8, warnings);
      ptr = encoderEnd;
      if (supported.encoder) {
        formParam.encoder = encoder;
      } else {
        warnings.push([
          "unsupported-form-detail",
          "Field encoder not allowed here: " + encoder.toString(),
        ]);
      }
    } else if (value.startsWith("headers=")) {
      const [headers, headersEnd] = getParamWord(p, ptr + 8, warnings);
      ptr = headersEnd;
      if (supported.headers) {
        if (headers.startsWith("@")) {
          if (formParam.headerFiles === undefined) {
            formParam.headerFiles = [];
          }
          formParam.headerFiles.push(headers.slice(1));
        } else {
          if (formParam.headers === undefined) {
            formParam.headers = [];
          }
          formParam.headers.push(headers);
        }
      } else {
        warnings.push([
          "unsupported-form-detail",
          "Field headers not allowed here: " + headers.toString(),
        ]);
      }
    } else {
      // TODO: it would be more consistent for curl to skip until the first "=", then
      // getParamWord, because quoting a ; in an unknown value breaks values that
      // come after it, e.g.:
      // curl -F 'myname=myvalue;bfilename="f;oo";filename=oeu' localhost:8888
      const unknown = getParamWord(p, ptr, warnings);
      const unknownEnd = unknown[1];
      ptr = unknownEnd;
      warnings.push([
        "unknown-form-detail",
        "skip unknown form field: " + value.toString(),
      ]);
    }
  }

  return formParam;
}

function isSpace(c: Token): boolean {
  // Implements the following macro from curl:
  // #define ISBLANK(x)  (((x) == ' ') || ((x) == '\t'))
  // #define ISSPACE(x)  (ISBLANK(x) || (((x) >= 0xa) && ((x) <= 0x0d)))
  return (
    typeof c === "string" &&
    (c === " " || c === "\t" || (c >= "\n" && c <= "\r"))
  );
}

function getParamWord(
  p: Word,
  start: number,
  warnings: Warnings,
): [Word, number] {
  let ptr = start;
  if (p.charAt(ptr) === '"') {
    ptr += 1;
    const parts: Token[] = [];
    while (ptr < p.length) {
      let curChar = p.charAt(ptr);
      if (curChar === "\\") {
        if (ptr + 1 < p.length) {
          const nextChar = p.charAt(ptr + 1);
          if (nextChar === '"' || nextChar === "\\") {
            ptr += 1;
            curChar = p.charAt(ptr);
          }
        }
      } else if (curChar === '"') {
        ptr += 1;
        let trailingData = false;
        while (ptr < p.length && p.charAt(ptr) !== ";") {
          if (!isSpace(p.charAt(ptr))) {
            trailingData = true;
          }
          ptr += 1;
        }
        if (trailingData) {
          warnings.push([
            "trailing-form-data",
            "Trailing data after quoted form parameter",
          ]);
        }
        return [new Word(parts), ptr];
      }
      parts.push(curChar);
      ptr += 1;
    }
  }
  let sepIdx = p.indexOf(";", start);
  if (sepIdx === -1) {
    sepIdx = p.length;
  }
  return [p.slice(start, sepIdx), sepIdx];
}

function getParamPart(
  formParam: FormParamPrototype,
  p: Word,
  ptr: number,
  supported: Supported,
  warnings: Warnings,
): FormParamPrototype {
  while (ptr < p.length && isSpace(p.charAt(ptr))) {
    ptr += 1;
  }
  const [content, contentEnd] = getParamWord(p, ptr, warnings);
  formParam.content = content;
  parseDetails(formParam, p, contentEnd, supported, warnings);
  return formParam;
}

// TODO: https://curl.se/docs/manpage.html#-F
// https://github.com/curl/curl/blob/curl-7_88_1/src/tool_formparse.c
// -F is a complicated option to parse.
export function parseForm(
  form: SrcFormParam[],
  warnings: Warnings,
): FormParam[] {
  const multipartUploads = [];
  let depth = 0;
  for (const multipartArgument of form) {
    const isString = multipartArgument.type === "string";

    if (!multipartArgument.value.includes("=")) {
      throw new CCError(
        'invalid value for --form/-F, missing "=": ' +
          JSON.stringify(multipartArgument.value.toString()),
      );
    }
    const [name, value] = multipartArgument.value.split("=", 2);
    const formParam: FormParamPrototype = { name };
    if (!isString && value.charAt(0) === "(") {
      depth += 1;
      warnings.push([
        "nested-form",
        'Nested form data with "=(" is not supported, it will be flattened',
      ]);
      getParamPart(
        formParam,
        value,
        1,
        {
          headers: true,
        },
        warnings,
      );
    } else if (!isString && name.length === 0 && eq(value, ")")) {
      depth -= 1;
      if (depth < 0) {
        throw new CCError(
          "no multipart to terminate: " +
            JSON.stringify(multipartArgument.value.toString()),
        );
      }
    } else if (!isString && value.charAt(0) === "@") {
      // TODO: there can be multiple files separated by a comma
      getParamPart(
        formParam,
        value,
        1,
        {
          filename: true,
          encoder: true,
          headers: true,
        },
        warnings,
      );

      formParam.contentFile = formParam.content;
      delete formParam.content;
      if (formParam.filename === null || formParam.filename === undefined) {
        formParam.filename = formParam.contentFile;
      }
      if (
        formParam.contentType === null ||
        formParam.contentType === undefined
      ) {
        // TODO: set from contentFile extension
      }
    } else if (!isString && value.charAt(0) === "<") {
      getParamPart(
        formParam,
        value,
        1,
        {
          encoder: true,
          headers: true,
        },
        warnings,
      );
      formParam.contentFile = formParam.content;
      delete formParam.content;
      if (
        formParam.contentType === null ||
        formParam.contentType === undefined
      ) {
        // TODO: set from contentFile extension
      }
    } else {
      if (isString) {
        formParam.content = value;
      } else {
        getParamPart(
          formParam,
          value,
          0,
          {
            filename: true,
            encoder: true,
            headers: true,
          },
          warnings,
        );
      }
    }

    multipartUploads.push(formParam);
  }
  return multipartUploads as FormParam[];
}
