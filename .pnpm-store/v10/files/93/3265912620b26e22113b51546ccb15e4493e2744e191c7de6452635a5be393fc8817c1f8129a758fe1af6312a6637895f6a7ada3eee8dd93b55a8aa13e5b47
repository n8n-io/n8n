const spawn = require('child_process').spawn;

module.exports = { tree, pidsForTree, getStat };

function getStat() {
  return new Promise((resolve) => {
    const command = `ls /proc | grep -E '^[0-9]+$' | xargs -I{} cat /proc/{}/stat`;
    const spawned = spawn('sh', ['-c', command], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    var res = '';
    spawned.stdout.on('data', (data) => (res += data));
    spawned.on('close', () => resolve(res));
  });
}

function template(s) {
  var stat = null;
  // 'pid', 'comm', 'state', 'ppid', 'pgrp'
  // %d     (%s)    %c       %d      %d
  s.replace(
    /(\d+) \((.*?)\)\s(.+?)\s(\d+)\s/g,
    (all, PID, COMMAND, STAT, PPID) => {
      stat = { PID, COMMAND, PPID, STAT };
    }
  );

  return stat;
}

function tree(stats) {
  const processes = stats.split('\n').map(template).filter(Boolean);

  return processes;
}

function pidsForTree(tree, pid) {
  if (typeof pid === 'number') {
    pid = pid.toString();
  }
  const parents = [pid];
  const pids = [];

  tree.forEach((proc) => {
    if (parents.indexOf(proc.PPID) !== -1) {
      parents.push(proc.PID);
      pids.push(proc);
    }
  });

  return pids;
}
