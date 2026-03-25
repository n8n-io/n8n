let assert = require('assert');
let exec = require('child_process').execSync;

const PROJECT_DIR = process.env.PROJECT_DIR;
const JAKE_CMD = `${PROJECT_DIR}/bin/cli.js`;

suite('concurrent', function () {

  this.timeout(7000);

  test(' simple concurrent prerequisites 1', function () {
    let out = exec(`${JAKE_CMD} -q concurrent:simple1`).toString().trim()
    assert.equal('Started A\nStarted B\nFinished B\nFinished A', out);
  });

  test(' simple concurrent prerequisites 2', function () {
    let out = exec(`${JAKE_CMD} -q concurrent:simple2`).toString().trim()
    assert.equal('Started C\nStarted D\nFinished C\nFinished D', out);
  });

  test(' sequential concurrent prerequisites', function () {
    let out = exec(`${JAKE_CMD} -q concurrent:seqconcurrent`).toString().trim()
    assert.equal('Started A\nStarted B\nFinished B\nFinished A\nStarted C\nStarted D\nFinished C\nFinished D', out);
  });

  test(' concurrent concurrent prerequisites', function () {
    let out = exec(`${JAKE_CMD} -q concurrent:concurrentconcurrent`).toString().trim()
    assert.equal('Started A\nStarted B\nStarted C\nStarted D\nFinished B\nFinished C\nFinished A\nFinished D', out);
  });

  test(' concurrent prerequisites with subdependency', function () {
    let out = exec(`${JAKE_CMD} -q concurrent:subdep`).toString().trim()
    assert.equal('Started A\nFinished A\nStarted Ba\nFinished Ba', out);
  });

  test(' failing in concurrent prerequisites', function () {
    try {
      exec(`${JAKE_CMD} -q concurrent:Cfail`);
    }
    catch(err) {
      assert(err.message.indexOf('Command failed') > -1);
    }
  });

});
