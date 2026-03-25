const { it, describe } = require('mocha');
const assume = require('assume');
const kuler = require('./');

describe('kuler', function () {
  it('renders colors in the terminal', function () {
    console.log('     VISUAL INSPECTION');
    console.log('     '+ kuler('red').style('F00'));
    console.log('     '+ kuler('black').style('#000'));
    console.log('     '+ kuler('white').style('#FFFFFF'));
    console.log('     '+ kuler('lime').style('AAFF5B'));
    console.log('     '+ kuler('violet').style('#ee82ee'));
    console.log('     '+ kuler('purple').style('#800080'));
    console.log('     '+ kuler('purple').style('#800080'), 'correctly reset to normal color');
    console.log('     '+ kuler('green', '#008000'));
  });

  describe('#style', function () {
    it('has a style method', function () {
      assume(kuler('what').style).is.a('function');
    });
  });
});
