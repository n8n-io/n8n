const tar = require("tar");
const path = require("path");
const tarball = path.resolve(process.argv[2]);
const dirname = path.resolve(process.argv[3]);

tar.extract({
    sync: true,
    file: tarball,
    cwd: dirname,
});
