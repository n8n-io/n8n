const spawn = require('child_process').spawn;

module.exports = function (rootPid, callback) {
  const pidsOfInterest = new Set([parseInt(rootPid, 10)]);
  var output = '';

  // *nix
  const ps = spawn('ps', ['-A', '-o', 'ppid,pid']);
  ps.stdout.on('data', (data) => {
    output += data.toString('ascii');
  });

  ps.on('close', () => {
    try {
      const res = output
        .split('\n')
        .slice(1)
        .map((_) => _.trim())
        .reduce((acc, line) => {
          const pids = line.split(/\s+/);
          const ppid = parseInt(pids[0], 10);

          if (pidsOfInterest.has(ppid)) {
            const pid = parseInt(pids[1], 10);
            acc.push(pid);
            pidsOfInterest.add(pid);
          }

          return acc;
        }, []);

      callback(null, res);
    } catch (e) {
      callback(e, null);
    }
  });
};
