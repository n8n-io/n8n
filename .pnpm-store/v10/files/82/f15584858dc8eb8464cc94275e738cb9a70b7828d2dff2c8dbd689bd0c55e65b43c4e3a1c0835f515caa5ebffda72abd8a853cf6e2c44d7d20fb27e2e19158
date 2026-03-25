// src/options.ts
var resolveOptions = (options) => ({
  targets: options.targets,
  structured: options.structured ?? false,
  silent: options.silent ?? false,
  watch: {
    options: options.watch?.options ?? {},
    reloadPageOnChange: options.watch?.reloadPageOnChange ?? false
  },
  hook: options.hook ?? "writeBundle"
});

// node_modules/.pnpm/@polka+url@1.0.0-next.28/node_modules/@polka/url/build.mjs
import * as qs from "node:querystring";
function parse2(req) {
  let raw = req.url;
  if (raw == null) return;
  let prev = req._parsedUrl;
  if (prev && prev.raw === raw) return prev;
  let pathname = raw, search = "", query;
  if (raw.length > 1) {
    let idx = raw.indexOf("?", 1);
    if (idx !== -1) {
      search = raw.substring(idx);
      pathname = raw.substring(0, idx);
      if (search.length > 1) {
        query = qs.parse(search.substring(1));
      }
    }
  }
  return req._parsedUrl = { pathname, search, query, raw };
}

// node_modules/.pnpm/mrmime@2.0.0/node_modules/mrmime/index.mjs
var mimes = {
  "3g2": "video/3gpp2",
  "3gp": "video/3gpp",
  "3gpp": "video/3gpp",
  "3mf": "model/3mf",
  "aac": "audio/aac",
  "ac": "application/pkix-attr-cert",
  "adp": "audio/adpcm",
  "adts": "audio/aac",
  "ai": "application/postscript",
  "aml": "application/automationml-aml+xml",
  "amlx": "application/automationml-amlx+zip",
  "amr": "audio/amr",
  "apng": "image/apng",
  "appcache": "text/cache-manifest",
  "appinstaller": "application/appinstaller",
  "appx": "application/appx",
  "appxbundle": "application/appxbundle",
  "asc": "application/pgp-keys",
  "atom": "application/atom+xml",
  "atomcat": "application/atomcat+xml",
  "atomdeleted": "application/atomdeleted+xml",
  "atomsvc": "application/atomsvc+xml",
  "au": "audio/basic",
  "avci": "image/avci",
  "avcs": "image/avcs",
  "avif": "image/avif",
  "aw": "application/applixware",
  "bdoc": "application/bdoc",
  "bin": "application/octet-stream",
  "bmp": "image/bmp",
  "bpk": "application/octet-stream",
  "btf": "image/prs.btif",
  "btif": "image/prs.btif",
  "buffer": "application/octet-stream",
  "ccxml": "application/ccxml+xml",
  "cdfx": "application/cdfx+xml",
  "cdmia": "application/cdmi-capability",
  "cdmic": "application/cdmi-container",
  "cdmid": "application/cdmi-domain",
  "cdmio": "application/cdmi-object",
  "cdmiq": "application/cdmi-queue",
  "cer": "application/pkix-cert",
  "cgm": "image/cgm",
  "cjs": "application/node",
  "class": "application/java-vm",
  "coffee": "text/coffeescript",
  "conf": "text/plain",
  "cpl": "application/cpl+xml",
  "cpt": "application/mac-compactpro",
  "crl": "application/pkix-crl",
  "css": "text/css",
  "csv": "text/csv",
  "cu": "application/cu-seeme",
  "cwl": "application/cwl",
  "cww": "application/prs.cww",
  "davmount": "application/davmount+xml",
  "dbk": "application/docbook+xml",
  "deb": "application/octet-stream",
  "def": "text/plain",
  "deploy": "application/octet-stream",
  "dib": "image/bmp",
  "disposition-notification": "message/disposition-notification",
  "dist": "application/octet-stream",
  "distz": "application/octet-stream",
  "dll": "application/octet-stream",
  "dmg": "application/octet-stream",
  "dms": "application/octet-stream",
  "doc": "application/msword",
  "dot": "application/msword",
  "dpx": "image/dpx",
  "drle": "image/dicom-rle",
  "dsc": "text/prs.lines.tag",
  "dssc": "application/dssc+der",
  "dtd": "application/xml-dtd",
  "dump": "application/octet-stream",
  "dwd": "application/atsc-dwd+xml",
  "ear": "application/java-archive",
  "ecma": "application/ecmascript",
  "elc": "application/octet-stream",
  "emf": "image/emf",
  "eml": "message/rfc822",
  "emma": "application/emma+xml",
  "emotionml": "application/emotionml+xml",
  "eps": "application/postscript",
  "epub": "application/epub+zip",
  "exe": "application/octet-stream",
  "exi": "application/exi",
  "exp": "application/express",
  "exr": "image/aces",
  "ez": "application/andrew-inset",
  "fdf": "application/fdf",
  "fdt": "application/fdt+xml",
  "fits": "image/fits",
  "g3": "image/g3fax",
  "gbr": "application/rpki-ghostbusters",
  "geojson": "application/geo+json",
  "gif": "image/gif",
  "glb": "model/gltf-binary",
  "gltf": "model/gltf+json",
  "gml": "application/gml+xml",
  "gpx": "application/gpx+xml",
  "gram": "application/srgs",
  "grxml": "application/srgs+xml",
  "gxf": "application/gxf",
  "gz": "application/gzip",
  "h261": "video/h261",
  "h263": "video/h263",
  "h264": "video/h264",
  "heic": "image/heic",
  "heics": "image/heic-sequence",
  "heif": "image/heif",
  "heifs": "image/heif-sequence",
  "hej2": "image/hej2k",
  "held": "application/atsc-held+xml",
  "hjson": "application/hjson",
  "hlp": "application/winhlp",
  "hqx": "application/mac-binhex40",
  "hsj2": "image/hsj2",
  "htm": "text/html",
  "html": "text/html",
  "ics": "text/calendar",
  "ief": "image/ief",
  "ifb": "text/calendar",
  "iges": "model/iges",
  "igs": "model/iges",
  "img": "application/octet-stream",
  "in": "text/plain",
  "ini": "text/plain",
  "ink": "application/inkml+xml",
  "inkml": "application/inkml+xml",
  "ipfix": "application/ipfix",
  "iso": "application/octet-stream",
  "its": "application/its+xml",
  "jade": "text/jade",
  "jar": "application/java-archive",
  "jhc": "image/jphc",
  "jls": "image/jls",
  "jp2": "image/jp2",
  "jpe": "image/jpeg",
  "jpeg": "image/jpeg",
  "jpf": "image/jpx",
  "jpg": "image/jpeg",
  "jpg2": "image/jp2",
  "jpgm": "image/jpm",
  "jpgv": "video/jpeg",
  "jph": "image/jph",
  "jpm": "image/jpm",
  "jpx": "image/jpx",
  "js": "text/javascript",
  "json": "application/json",
  "json5": "application/json5",
  "jsonld": "application/ld+json",
  "jsonml": "application/jsonml+json",
  "jsx": "text/jsx",
  "jt": "model/jt",
  "jxr": "image/jxr",
  "jxra": "image/jxra",
  "jxrs": "image/jxrs",
  "jxs": "image/jxs",
  "jxsc": "image/jxsc",
  "jxsi": "image/jxsi",
  "jxss": "image/jxss",
  "kar": "audio/midi",
  "ktx": "image/ktx",
  "ktx2": "image/ktx2",
  "less": "text/less",
  "lgr": "application/lgr+xml",
  "list": "text/plain",
  "litcoffee": "text/coffeescript",
  "log": "text/plain",
  "lostxml": "application/lost+xml",
  "lrf": "application/octet-stream",
  "m1v": "video/mpeg",
  "m21": "application/mp21",
  "m2a": "audio/mpeg",
  "m2v": "video/mpeg",
  "m3a": "audio/mpeg",
  "m4a": "audio/mp4",
  "m4p": "application/mp4",
  "m4s": "video/iso.segment",
  "ma": "application/mathematica",
  "mads": "application/mads+xml",
  "maei": "application/mmt-aei+xml",
  "man": "text/troff",
  "manifest": "text/cache-manifest",
  "map": "application/json",
  "mar": "application/octet-stream",
  "markdown": "text/markdown",
  "mathml": "application/mathml+xml",
  "mb": "application/mathematica",
  "mbox": "application/mbox",
  "md": "text/markdown",
  "mdx": "text/mdx",
  "me": "text/troff",
  "mesh": "model/mesh",
  "meta4": "application/metalink4+xml",
  "metalink": "application/metalink+xml",
  "mets": "application/mets+xml",
  "mft": "application/rpki-manifest",
  "mid": "audio/midi",
  "midi": "audio/midi",
  "mime": "message/rfc822",
  "mj2": "video/mj2",
  "mjp2": "video/mj2",
  "mjs": "text/javascript",
  "mml": "text/mathml",
  "mods": "application/mods+xml",
  "mov": "video/quicktime",
  "mp2": "audio/mpeg",
  "mp21": "application/mp21",
  "mp2a": "audio/mpeg",
  "mp3": "audio/mpeg",
  "mp4": "video/mp4",
  "mp4a": "audio/mp4",
  "mp4s": "application/mp4",
  "mp4v": "video/mp4",
  "mpd": "application/dash+xml",
  "mpe": "video/mpeg",
  "mpeg": "video/mpeg",
  "mpf": "application/media-policy-dataset+xml",
  "mpg": "video/mpeg",
  "mpg4": "video/mp4",
  "mpga": "audio/mpeg",
  "mpp": "application/dash-patch+xml",
  "mrc": "application/marc",
  "mrcx": "application/marcxml+xml",
  "ms": "text/troff",
  "mscml": "application/mediaservercontrol+xml",
  "msh": "model/mesh",
  "msi": "application/octet-stream",
  "msix": "application/msix",
  "msixbundle": "application/msixbundle",
  "msm": "application/octet-stream",
  "msp": "application/octet-stream",
  "mtl": "model/mtl",
  "musd": "application/mmt-usd+xml",
  "mxf": "application/mxf",
  "mxmf": "audio/mobile-xmf",
  "mxml": "application/xv+xml",
  "n3": "text/n3",
  "nb": "application/mathematica",
  "nq": "application/n-quads",
  "nt": "application/n-triples",
  "obj": "model/obj",
  "oda": "application/oda",
  "oga": "audio/ogg",
  "ogg": "audio/ogg",
  "ogv": "video/ogg",
  "ogx": "application/ogg",
  "omdoc": "application/omdoc+xml",
  "onepkg": "application/onenote",
  "onetmp": "application/onenote",
  "onetoc": "application/onenote",
  "onetoc2": "application/onenote",
  "opf": "application/oebps-package+xml",
  "opus": "audio/ogg",
  "otf": "font/otf",
  "owl": "application/rdf+xml",
  "oxps": "application/oxps",
  "p10": "application/pkcs10",
  "p7c": "application/pkcs7-mime",
  "p7m": "application/pkcs7-mime",
  "p7s": "application/pkcs7-signature",
  "p8": "application/pkcs8",
  "pdf": "application/pdf",
  "pfr": "application/font-tdpfr",
  "pgp": "application/pgp-encrypted",
  "pkg": "application/octet-stream",
  "pki": "application/pkixcmp",
  "pkipath": "application/pkix-pkipath",
  "pls": "application/pls+xml",
  "png": "image/png",
  "prc": "model/prc",
  "prf": "application/pics-rules",
  "provx": "application/provenance+xml",
  "ps": "application/postscript",
  "pskcxml": "application/pskc+xml",
  "pti": "image/prs.pti",
  "qt": "video/quicktime",
  "raml": "application/raml+yaml",
  "rapd": "application/route-apd+xml",
  "rdf": "application/rdf+xml",
  "relo": "application/p2p-overlay+xml",
  "rif": "application/reginfo+xml",
  "rl": "application/resource-lists+xml",
  "rld": "application/resource-lists-diff+xml",
  "rmi": "audio/midi",
  "rnc": "application/relax-ng-compact-syntax",
  "rng": "application/xml",
  "roa": "application/rpki-roa",
  "roff": "text/troff",
  "rq": "application/sparql-query",
  "rs": "application/rls-services+xml",
  "rsat": "application/atsc-rsat+xml",
  "rsd": "application/rsd+xml",
  "rsheet": "application/urc-ressheet+xml",
  "rss": "application/rss+xml",
  "rtf": "text/rtf",
  "rtx": "text/richtext",
  "rusd": "application/route-usd+xml",
  "s3m": "audio/s3m",
  "sbml": "application/sbml+xml",
  "scq": "application/scvp-cv-request",
  "scs": "application/scvp-cv-response",
  "sdp": "application/sdp",
  "senmlx": "application/senml+xml",
  "sensmlx": "application/sensml+xml",
  "ser": "application/java-serialized-object",
  "setpay": "application/set-payment-initiation",
  "setreg": "application/set-registration-initiation",
  "sgi": "image/sgi",
  "sgm": "text/sgml",
  "sgml": "text/sgml",
  "shex": "text/shex",
  "shf": "application/shf+xml",
  "shtml": "text/html",
  "sieve": "application/sieve",
  "sig": "application/pgp-signature",
  "sil": "audio/silk",
  "silo": "model/mesh",
  "siv": "application/sieve",
  "slim": "text/slim",
  "slm": "text/slim",
  "sls": "application/route-s-tsid+xml",
  "smi": "application/smil+xml",
  "smil": "application/smil+xml",
  "snd": "audio/basic",
  "so": "application/octet-stream",
  "spdx": "text/spdx",
  "spp": "application/scvp-vp-response",
  "spq": "application/scvp-vp-request",
  "spx": "audio/ogg",
  "sql": "application/sql",
  "sru": "application/sru+xml",
  "srx": "application/sparql-results+xml",
  "ssdl": "application/ssdl+xml",
  "ssml": "application/ssml+xml",
  "stk": "application/hyperstudio",
  "stl": "model/stl",
  "stpx": "model/step+xml",
  "stpxz": "model/step-xml+zip",
  "stpz": "model/step+zip",
  "styl": "text/stylus",
  "stylus": "text/stylus",
  "svg": "image/svg+xml",
  "svgz": "image/svg+xml",
  "swidtag": "application/swid+xml",
  "t": "text/troff",
  "t38": "image/t38",
  "td": "application/urc-targetdesc+xml",
  "tei": "application/tei+xml",
  "teicorpus": "application/tei+xml",
  "text": "text/plain",
  "tfi": "application/thraud+xml",
  "tfx": "image/tiff-fx",
  "tif": "image/tiff",
  "tiff": "image/tiff",
  "toml": "application/toml",
  "tr": "text/troff",
  "trig": "application/trig",
  "ts": "video/mp2t",
  "tsd": "application/timestamped-data",
  "tsv": "text/tab-separated-values",
  "ttc": "font/collection",
  "ttf": "font/ttf",
  "ttl": "text/turtle",
  "ttml": "application/ttml+xml",
  "txt": "text/plain",
  "u3d": "model/u3d",
  "u8dsn": "message/global-delivery-status",
  "u8hdr": "message/global-headers",
  "u8mdn": "message/global-disposition-notification",
  "u8msg": "message/global",
  "ubj": "application/ubjson",
  "uri": "text/uri-list",
  "uris": "text/uri-list",
  "urls": "text/uri-list",
  "vcard": "text/vcard",
  "vrml": "model/vrml",
  "vtt": "text/vtt",
  "vxml": "application/voicexml+xml",
  "war": "application/java-archive",
  "wasm": "application/wasm",
  "wav": "audio/wav",
  "weba": "audio/webm",
  "webm": "video/webm",
  "webmanifest": "application/manifest+json",
  "webp": "image/webp",
  "wgsl": "text/wgsl",
  "wgt": "application/widget",
  "wif": "application/watcherinfo+xml",
  "wmf": "image/wmf",
  "woff": "font/woff",
  "woff2": "font/woff2",
  "wrl": "model/vrml",
  "wsdl": "application/wsdl+xml",
  "wspolicy": "application/wspolicy+xml",
  "x3d": "model/x3d+xml",
  "x3db": "model/x3d+fastinfoset",
  "x3dbz": "model/x3d+binary",
  "x3dv": "model/x3d-vrml",
  "x3dvz": "model/x3d+vrml",
  "x3dz": "model/x3d+xml",
  "xaml": "application/xaml+xml",
  "xav": "application/xcap-att+xml",
  "xca": "application/xcap-caps+xml",
  "xcs": "application/calendar+xml",
  "xdf": "application/xcap-diff+xml",
  "xdssc": "application/dssc+xml",
  "xel": "application/xcap-el+xml",
  "xenc": "application/xenc+xml",
  "xer": "application/patch-ops-error+xml",
  "xfdf": "application/xfdf",
  "xht": "application/xhtml+xml",
  "xhtml": "application/xhtml+xml",
  "xhvml": "application/xv+xml",
  "xlf": "application/xliff+xml",
  "xm": "audio/xm",
  "xml": "text/xml",
  "xns": "application/xcap-ns+xml",
  "xop": "application/xop+xml",
  "xpl": "application/xproc+xml",
  "xsd": "application/xml",
  "xsf": "application/prs.xsf+xml",
  "xsl": "application/xml",
  "xslt": "application/xml",
  "xspf": "application/xspf+xml",
  "xvm": "application/xv+xml",
  "xvml": "application/xv+xml",
  "yaml": "text/yaml",
  "yang": "application/yang",
  "yin": "application/yin+xml",
  "yml": "text/yaml",
  "zip": "application/zip"
};
function lookup(extn) {
  let tmp = ("" + extn).trim().toLowerCase();
  let idx = tmp.lastIndexOf(".");
  return mimes[!~idx ? tmp : tmp.substring(++idx)];
}

// src/middleware.ts
import { statSync, createReadStream, existsSync } from "node:fs";
import { join, resolve } from "node:path";

// src/utils.ts
import fastglob from "fast-glob";
import path from "node:path";
import fs from "fs-extra";
import pc from "picocolors";
import { createHash } from "node:crypto";
async function renameTarget(target, rename, src) {
  const parsedPath = path.parse(target);
  if (typeof rename === "string") {
    return rename;
  }
  return rename(parsedPath.name, parsedPath.ext.replace(".", ""), src);
}
var collectCopyTargets = async (root, targets, structured, silent) => {
  const copyTargets = [];
  for (const target of targets) {
    const {
      src,
      dest,
      rename,
      transform,
      preserveTimestamps,
      dereference,
      overwrite
    } = target;
    const matchedPaths = await fastglob(src, {
      onlyFiles: false,
      dot: true,
      cwd: root
    });
    if (matchedPaths.length === 0 && !silent) {
      throw new Error(`No file was found to copy on ${src} src.`);
    }
    for (const matchedPath of matchedPaths) {
      const relativeMatchedPath = path.isAbsolute(matchedPath) ? path.relative(root, matchedPath) : matchedPath;
      const absoluteMatchedPath = path.resolve(root, matchedPath);
      if (transform) {
        const srcStat = await fs.stat(absoluteMatchedPath);
        if (!srcStat.isFile()) {
          throw new Error(
            `"transform" option only supports a file: '${relativeMatchedPath}' is not a file`
          );
        }
      }
      const { base, dir } = path.parse(relativeMatchedPath);
      let destDir;
      if (!structured || !dir) {
        destDir = dest;
      } else {
        const dirClean = dir.replace(/^(?:\.\.\/)+/, "");
        const destClean = `${dest}/${dirClean}`.replace(/^\/+|\/+$/g, "");
        destDir = destClean;
      }
      copyTargets.push({
        src: relativeMatchedPath,
        dest: path.join(
          destDir,
          rename ? await renameTarget(base, rename, absoluteMatchedPath) : base
        ),
        transform,
        preserveTimestamps: preserveTimestamps ?? false,
        dereference: dereference ?? true,
        overwrite: overwrite ?? true
      });
    }
  }
  return copyTargets;
};
async function getTransformedContent(file, transform) {
  if (transform.encoding === "buffer") {
    const content2 = await fs.readFile(file);
    return transform.handler(content2, file);
  }
  const content = await fs.readFile(file, transform.encoding);
  return transform.handler(content, file);
}
async function transformCopy(transform, src, dest, overwrite) {
  if (overwrite === false || overwrite === "error") {
    const exists = await fsExists(dest);
    if (exists) {
      if (overwrite === false) {
        return { copied: false };
      }
      if (overwrite === "error") {
        throw new Error(`File ${dest} already exists`);
      }
    }
  }
  const transformedContent = await getTransformedContent(src, transform);
  if (transformedContent === null) {
    return { copied: false };
  }
  await fs.outputFile(dest, transformedContent);
  return { copied: true };
}
var copyAll = async (rootSrc, rootDest, targets, structured, silent) => {
  const copyTargets = await collectCopyTargets(
    rootSrc,
    targets,
    structured,
    silent
  );
  let copiedCount = 0;
  for (const copyTarget of copyTargets) {
    const { src, dest, transform, preserveTimestamps, dereference, overwrite } = copyTarget;
    const resolvedSrc = path.resolve(rootSrc, src);
    const resolvedDest = path.resolve(rootSrc, rootDest, dest);
    const transformOption = resolveTransformOption(transform);
    if (transformOption) {
      const result = await transformCopy(
        transformOption,
        resolvedSrc,
        resolvedDest,
        overwrite
      );
      if (result.copied) {
        copiedCount++;
      }
    } else {
      await fs.copy(resolvedSrc, resolvedDest, {
        preserveTimestamps,
        dereference,
        overwrite: overwrite === true,
        errorOnExist: overwrite === "error"
      });
      copiedCount++;
    }
  }
  return { targets: copyTargets.length, copied: copiedCount };
};
var updateFileMapFromTargets = (targets, fileMap) => {
  fileMap.clear();
  for (const target of [...targets].reverse()) {
    let dest = target.dest.replace(/\\/g, "/");
    if (!dest.startsWith("/")) {
      dest = `/${dest}`;
    }
    if (!fileMap.has(dest)) {
      fileMap.set(dest, []);
    }
    fileMap.get(dest).push({
      src: target.src,
      dest: target.dest,
      overwrite: target.overwrite,
      transform: target.transform
    });
  }
};
var calculateMd5Base64 = (content) => createHash("md5").update(content).digest("base64");
var formatConsole = (msg) => `${pc.cyan("[vite-plugin-static-copy]")} ${msg}`;
var outputCollectedLog = (logger, collectedMap) => {
  if (collectedMap.size > 0) {
    logger.info(
      formatConsole(pc.green(`Collected ${collectedMap.size} items.`))
    );
    if (process.env.DEBUG === "vite:plugin-static-copy") {
      for (const [key, vals] of collectedMap) {
        for (const val of vals) {
          logger.info(
            formatConsole(
              `  - '${key}' -> '${val.src}'${val.transform ? " (with content transform)" : ""}`
            )
          );
        }
      }
    }
  } else {
    logger.warn(formatConsole(pc.yellow("No items found.")));
  }
};
var outputCopyLog = (logger, result) => {
  if (result.targets > 0) {
    const copiedMessage = pc.green(`Copied ${result.copied} items.`);
    const skipped = result.targets - result.copied;
    const skippedMessage = skipped > 0 ? ` ${pc.gray(`(Skipped ${skipped} items.)`)}` : "";
    logger.info(formatConsole(`${copiedMessage}${skippedMessage}`));
  }
};
function resolveTransformOption(transformOption) {
  if (typeof transformOption === "function") {
    return {
      handler: transformOption,
      encoding: "utf8"
    };
  }
  return transformOption;
}
async function fsExists(p) {
  try {
    await fs.stat(p);
  } catch (e) {
    if (e.code === "ENOENT") {
      return false;
    }
    throw e;
  }
  return true;
}

// src/middleware.ts
function shouldServeOverwriteCheck(overwrite, srcAbsolutePath, root, publicDir, dest) {
  const publicDirDisabled = publicDir === "";
  if (overwrite === true || publicDirDisabled) {
    return true;
  }
  const publicFile = resolve(publicDir, dest);
  if (existsSync(publicFile)) {
    if (overwrite === "error" && existsSync(srcAbsolutePath)) {
      const destAbsolutePath = resolve(root, dest);
      throw new Error(
        `File ${destAbsolutePath} will be copied from ${publicFile} (overwrite option is set to "error")`
      );
    }
    return false;
  }
  return true;
}
function viaLocal(root, publicDir, fileMap, uri) {
  if (uri.endsWith("/")) {
    uri = uri.slice(0, -1);
  }
  const files = fileMap.get(uri);
  if (files && files[0]) {
    const file = files[0];
    const filepath = resolve(root, file.src);
    const overwriteCheck = shouldServeOverwriteCheck(
      file.overwrite,
      filepath,
      root,
      publicDir,
      file.dest
    );
    if (overwriteCheck === false) {
      return void 0;
    }
    const stats = statSync(filepath);
    return { filepath, stats, transform: file.transform };
  }
  for (const [key, vals] of fileMap) {
    const dir = key.endsWith("/") ? key : `${key}/`;
    if (!uri.startsWith(dir)) continue;
    for (const val of vals) {
      const filepath = resolve(root, val.src, uri.slice(dir.length));
      const overwriteCheck = shouldServeOverwriteCheck(
        val.overwrite,
        filepath,
        root,
        publicDir,
        join(val.dest, uri.slice(dir.length))
      );
      if (overwriteCheck === false) {
        return void 0;
      }
      const stats = statSync(filepath, { throwIfNoEntry: false });
      if (stats) {
        return { filepath, stats };
      }
    }
    return void 0;
  }
  return void 0;
}
function getStaticHeaders(stats) {
  return {
    "Content-Length": stats.size,
    "Last-Modified": stats.mtime.toUTCString(),
    ETag: `W/"${stats.size}-${stats.mtime.getTime()}"`,
    "Cache-Control": "no-cache"
  };
}
function getTransformHeaders(encoding, content) {
  return {
    "Content-Length": Buffer.byteLength(
      content,
      encoding === "buffer" ? void 0 : encoding
    ),
    ETag: `W/"${calculateMd5Base64(content)}"`,
    "Cache-Control": "no-cache"
  };
}
function getMergeHeaders(headers, res) {
  headers = { ...headers };
  for (const key in headers) {
    const tmp = res.getHeader(key);
    if (tmp) headers[key] = tmp;
  }
  const contentTypeHeader = res.getHeader("content-type");
  if (contentTypeHeader) {
    headers["Content-Type"] = contentTypeHeader;
  }
  return headers;
}
function sendStatic(req, res, file, stats) {
  const staticHeaders = getStaticHeaders(stats);
  if (req.headers["if-none-match"] === staticHeaders["ETag"]) {
    res.writeHead(304);
    res.end();
    return;
  }
  let code = 200;
  const headers = getMergeHeaders(staticHeaders, res);
  const opts = {};
  if (req.headers.range) {
    code = 206;
    const [x, y] = req.headers.range.replace("bytes=", "").split("-");
    let end = (y ? parseInt(y, 10) : 0) || stats.size - 1;
    const start = (x ? parseInt(x, 10) : 0) || 0;
    opts.end = end;
    opts.start = start;
    if (end >= stats.size) {
      end = stats.size - 1;
    }
    if (start >= stats.size) {
      res.setHeader("Content-Range", `bytes */${stats.size}`);
      res.statusCode = 416;
      res.end();
      return;
    }
    headers["Content-Range"] = `bytes ${start}-${end}/${stats.size}`;
    headers["Content-Length"] = end - start + 1;
    headers["Accept-Ranges"] = "bytes";
  }
  res.writeHead(code, headers);
  createReadStream(file, opts).pipe(res);
}
function sendTransform(req, res, transform, transformedContent) {
  const transformHeaders = getTransformHeaders(
    transform.encoding,
    transformedContent
  );
  if (req.headers["if-none-match"] === transformHeaders["ETag"]) {
    res.writeHead(304);
    res.end();
    return;
  }
  const code = 200;
  const headers = getMergeHeaders(transformHeaders, res);
  res.writeHead(code, headers);
  res.end(transformedContent);
  return;
}
function setHeaders(res, pathname, headers) {
  if (/\.[tj]sx?$/.test(pathname)) {
    res.setHeader("Content-Type", "text/javascript");
  } else {
    let ctype = lookup(pathname) || "";
    if (ctype === "text/html") ctype += ";charset=utf-8";
    res.setHeader("Content-Type", ctype);
  }
  if (headers) {
    for (const name in headers) {
      res.setHeader(name, headers[name]);
    }
  }
}
function return404(res, next) {
  if (next) {
    next();
    return;
  }
  res.statusCode = 404;
  res.end();
}
function serveStaticCopyMiddleware({
  root,
  publicDir,
  server
}, fileMap) {
  return async function viteServeStaticCopyMiddleware(req, res, next) {
    let pathname = parse2(req).pathname;
    if (pathname.includes("%")) {
      try {
        pathname = decodeURI(pathname);
      } catch {
      }
    }
    try {
      const data = viaLocal(root, publicDir, fileMap, pathname);
      if (!data || data.stats.isDirectory()) {
        return404(res, next);
        return;
      }
      const transformOption = resolveTransformOption(data.transform);
      if (transformOption) {
        const transformedContent = await getTransformedContent(
          data.filepath,
          transformOption
        );
        if (transformedContent === null) {
          return404(res, next);
          return;
        }
        setHeaders(res, pathname, server.headers);
        sendTransform(req, res, transformOption, transformedContent);
        return;
      }
      setHeaders(res, pathname, server.headers);
      sendStatic(req, res, data.filepath, data.stats);
    } catch (e) {
      if (e instanceof Error) {
        next(e);
        return;
      }
      throw e;
    }
  };
}

// node_modules/.pnpm/throttle-debounce@5.0.2/node_modules/throttle-debounce/esm/index.js
function throttle(delay, callback, options) {
  var _ref = options || {}, _ref$noTrailing = _ref.noTrailing, noTrailing = _ref$noTrailing === void 0 ? false : _ref$noTrailing, _ref$noLeading = _ref.noLeading, noLeading = _ref$noLeading === void 0 ? false : _ref$noLeading, _ref$debounceMode = _ref.debounceMode, debounceMode = _ref$debounceMode === void 0 ? void 0 : _ref$debounceMode;
  var timeoutID;
  var cancelled = false;
  var lastExec = 0;
  function clearExistingTimeout() {
    if (timeoutID) {
      clearTimeout(timeoutID);
    }
  }
  function cancel(options2) {
    var _ref2 = options2 || {}, _ref2$upcomingOnly = _ref2.upcomingOnly, upcomingOnly = _ref2$upcomingOnly === void 0 ? false : _ref2$upcomingOnly;
    clearExistingTimeout();
    cancelled = !upcomingOnly;
  }
  function wrapper() {
    for (var _len = arguments.length, arguments_ = new Array(_len), _key = 0; _key < _len; _key++) {
      arguments_[_key] = arguments[_key];
    }
    var self = this;
    var elapsed = Date.now() - lastExec;
    if (cancelled) {
      return;
    }
    function exec() {
      lastExec = Date.now();
      callback.apply(self, arguments_);
    }
    function clear() {
      timeoutID = void 0;
    }
    if (!noLeading && debounceMode && !timeoutID) {
      exec();
    }
    clearExistingTimeout();
    if (debounceMode === void 0 && elapsed > delay) {
      if (noLeading) {
        lastExec = Date.now();
        if (!noTrailing) {
          timeoutID = setTimeout(debounceMode ? clear : exec, delay);
        }
      } else {
        exec();
      }
    } else if (noTrailing !== true) {
      timeoutID = setTimeout(debounceMode ? clear : exec, debounceMode === void 0 ? delay - elapsed : delay);
    }
  }
  wrapper.cancel = cancel;
  return wrapper;
}
function debounce(delay, callback, options) {
  var _ref = options || {}, _ref$atBegin = _ref.atBegin, atBegin = _ref$atBegin === void 0 ? false : _ref$atBegin;
  return throttle(delay, callback, {
    debounceMode: atBegin !== false
  });
}

// src/serve.ts
import chokidar from "chokidar";
import pc2 from "picocolors";
var servePlugin = ({
  targets,
  structured,
  watch,
  silent
}) => {
  let config;
  let watcher;
  const fileMap = /* @__PURE__ */ new Map();
  const collectFileMap = async () => {
    try {
      const copyTargets = await collectCopyTargets(
        config.root,
        targets,
        structured,
        silent
      );
      updateFileMapFromTargets(copyTargets, fileMap);
    } catch (e) {
      if (!silent) {
        config.logger.error(formatConsole(pc2.red(e.toString())));
      }
    }
  };
  const collectFileMapDebounce = debounce(100, async () => {
    await collectFileMap();
  });
  return {
    name: "vite-plugin-static-copy:serve",
    apply: "serve",
    configResolved(_config) {
      config = _config;
    },
    async buildStart() {
      await collectFileMap();
    },
    configureServer({ httpServer, middlewares, ws }) {
      const reloadPage = () => {
        ws.send({ type: "full-reload", path: "*" });
      };
      watcher = chokidar.watch(
        targets.flatMap((target) => target.src),
        {
          cwd: config.root,
          ignoreInitial: true,
          ...watch.options
        }
      );
      watcher.on("add", async (path2) => {
        if (!silent) {
          config.logger.info(
            formatConsole(`${pc2.green("detected new file")} ${path2}`),
            {
              timestamp: true
            }
          );
        }
        await collectFileMapDebounce();
        if (watch.reloadPageOnChange) {
          reloadPage();
        }
      });
      if (watch.reloadPageOnChange) {
        watcher.on("change", (path2) => {
          if (!silent) {
            config.logger.info(
              formatConsole(`${pc2.green("file changed")} ${path2}`),
              {
                timestamp: true
              }
            );
          }
          reloadPage();
        });
        watcher.on("unlink", (path2) => {
          if (!silent) {
            config.logger.info(
              formatConsole(`${pc2.green("file deleted")} ${path2}`),
              {
                timestamp: true
              }
            );
          }
          reloadPage();
        });
      }
      if (!silent) {
        httpServer?.once("listening", () => {
          setTimeout(() => {
            outputCollectedLog(config.logger, fileMap);
          }, 0);
        });
      }
      return () => {
        middlewares.use(serveStaticCopyMiddleware(config, fileMap));
        const targetMiddlewareIndex = findMiddlewareIndex(middlewares.stack, [
          "viteServePublicMiddleware",
          "viteTransformMiddleware"
        ]);
        const serveStaticCopyMiddlewareIndex = findMiddlewareIndex(
          middlewares.stack,
          "viteServeStaticCopyMiddleware"
        );
        const serveStaticCopyMiddlewareItem = middlewares.stack.splice(
          serveStaticCopyMiddlewareIndex,
          1
        )[0];
        if (serveStaticCopyMiddlewareItem === void 0) throw new Error();
        middlewares.stack.splice(
          targetMiddlewareIndex,
          0,
          serveStaticCopyMiddlewareItem
        );
      };
    },
    async closeBundle() {
      await watcher.close();
    }
  };
};
var findMiddlewareIndex = (stack, names) => {
  const ns = Array.isArray(names) ? names : [names];
  for (const name of ns) {
    const index = stack.findIndex(
      (middleware) => typeof middleware.handle === "function" && middleware.handle.name === name
    );
    if (index > 0) {
      return index;
    }
  }
  return -1;
};

// src/build.ts
var buildPlugin = ({
  targets,
  structured,
  silent,
  hook
}) => {
  let config;
  let output = false;
  return {
    name: "vite-plugin-static-copy:build",
    apply: "build",
    configResolved(_config) {
      config = _config;
    },
    buildEnd() {
      output = false;
    },
    async [hook]() {
      if (output) return;
      output = true;
      const result = await copyAll(
        config.root,
        config.build.outDir,
        targets,
        structured,
        silent
      );
      if (!silent) outputCopyLog(config.logger, result);
    }
  };
};

// src/index.ts
var viteStaticCopy = (options) => {
  const resolvedOptions = resolveOptions(options);
  return [servePlugin(resolvedOptions), buildPlugin(resolvedOptions)];
};
export {
  viteStaticCopy
};
