let assert = require('assert');
let exec = require('child_process').execSync;

const PROJECT_DIR = process.env.PROJECT_DIR;
const JAKE_CMD = `${PROJECT_DIR}/bin/cli.js`;

suite('publishTask', function () {

  this.timeout(7000);

  test('default task', function () {
    let out = exec(`${JAKE_CMD} -q publish`).toString().trim();
    let expected = [
      'Fetched remote tags.'
      , 'On branch v0.0'
      , 'Bumped version number to v0.0.2.'
      , 'Created package for zerb v0.0.2'
      , 'Publishing zerb v0.0.2'
      , './pkg/zerb-v0.0.2.tar.gz'
      , 'BOOM! Published.'
      , 'Cleaned up package'
    ].join('\n');
    assert.equal(expected, out);
  });

});

