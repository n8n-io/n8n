import * as fs from "fs"
import tariff from "tariff"

fs.writeFileSync("ist.cjs",
                 "// (This file is generated from ist.js. Don't edit it directly.)\n\n" +
                 tariff(fs.readFileSync("ist.js", "utf8")))
