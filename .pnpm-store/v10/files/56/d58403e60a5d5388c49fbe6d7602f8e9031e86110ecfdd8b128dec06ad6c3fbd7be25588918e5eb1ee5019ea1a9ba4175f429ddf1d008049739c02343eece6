'use strict';

const fs = require('fs');
const misc_strings = require('../misc/strings.cjs');

function FileSystemIconLoader(dir, transform) {
  return async (name) => {
    const paths = [
      `${dir}/${name}.svg`,
      `${dir}/${misc_strings.camelize(name)}.svg`,
      `${dir}/${misc_strings.pascalize(name)}.svg`,
      `${dir}/${misc_strings.snakelize(name)}.svg`
    ];
    let stat;
    for (const path of paths) {
      try {
        stat = await fs.promises.lstat(path);
      } catch (err) {
        continue;
      }
      if (stat.isFile()) {
        let svg = await fs.promises.readFile(path, "utf-8");
        const cleanupIdx = svg.indexOf("<svg");
        if (cleanupIdx > 0)
          svg = svg.slice(cleanupIdx);
        return typeof transform === "function" ? await transform(svg) : svg;
      }
    }
  };
}

exports.FileSystemIconLoader = FileSystemIconLoader;
