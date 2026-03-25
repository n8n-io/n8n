const exec = require('child_process').exec;
const tree = require('./tree');
const utils = require('./utils');
var hasPS = true;

// discover if the OS has `ps`, and therefore can use psTree
exec('ps', (error) => {
  module.exports.hasPS = hasPS = !error;
});

module.exports = function main(pid, callback) {
  if (typeof pid === 'number') {
    pid = pid.toString();
  }

  if (hasPS && !process.env.NO_PS) {
    return tree(pid, callback);
  }

  utils
    .getStat()
    .then(utils.tree)
    .then((tree) => utils.pidsForTree(tree, pid))
    .then((res) =>
      callback(
        null,
        res.map((p) => p.PID)
      )
    )
    .catch((error) => callback(error));
};

if (!module.parent) {
  module.exports(process.argv[2], (e, pids) => console.log(pids));
}

module.exports.hasPS = hasPS;
