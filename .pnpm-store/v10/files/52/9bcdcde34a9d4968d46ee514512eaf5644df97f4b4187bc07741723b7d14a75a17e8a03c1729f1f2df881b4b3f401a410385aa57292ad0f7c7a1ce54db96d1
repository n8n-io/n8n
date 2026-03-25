var test = require('tape');
var utf7 = require('..').imap;

test('test conversion from utf8 to utf7', function(assert) {
  assert.plan(9);

  // Examples from RFC 2152.
  assert.equal('A&ImIDkQ-.', utf7.encode('A\u2262\u0391.'));
  assert.equal('&ZeVnLIqe-', utf7.encode('\u65E5\u672C\u8A9E'));
  assert.equal('Hi Mom -&Jjo--!', utf7.encode('Hi Mom -\u263A-!'));
  assert.equal('Item 3 is &AKM-1.', utf7.encode('Item 3 is \u00A31.'));

  // Custom examples that contain more than one mode shift.
  assert.equal('Jyv&AOQ-skyl&AOQ-', utf7.encode('Jyv\u00E4skyl\u00E4'));
  assert.equal('\'&T2BZfQ-\' hei&AN8-t "Hallo"', utf7.encode('\'\u4F60\u597D\' heißt "Hallo"'));

  // The ampersand sign is represented as &-.
  assert.equal('Hot &- Spicy &- Fruity', utf7.encode('Hot & Spicy & Fruity'));

  // Slashes are converted to commas.
  assert.equal('&,,,typh2VDIf7Q-', utf7.encode('\uffff\uedca\u9876\u5432\u1fed'));

  // & sign around non-ASCII chars
  assert.equal('&AOQ-&-&AOQ-&-&AOQ-', utf7.encode('\u00E4&\u00E4&\u00E4'));
});

test('test conversion from utf7 to utf8', function(assert) {
  assert.plan(9);

  // Examples from RFC 2152.
  assert.equal('A\u2262\u0391.', utf7.decode('A&ImIDkQ-.'));
  assert.equal('\u65E5\u672C\u8A9E', utf7.decode('&ZeVnLIqe-'));
  assert.equal('Hi Mom -\u263A-!', utf7.decode('Hi Mom -&Jjo--!'));
  assert.equal('Item 3 is \u00A31.', utf7.decode('Item 3 is &AKM-1.'));

  // Custom examples that contain more than one mode shift.
  assert.equal('Jyv\u00E4skyl\u00E4', utf7.decode('Jyv&AOQ-skyl&AOQ-'));
  assert.equal('\'\u4F60\u597D\' heißt "Hallo"', utf7.decode('\'&T2BZfQ-\' hei&AN8-t "Hallo"'));

  // The ampersand sign is represented by &-.
  assert.equal('Hot & Spicy & Fruity', utf7.decode('Hot &- Spicy &- Fruity'));

  // Slashes are converted to commas.
  assert.equal('\uffff\uedca\u9876\u5432\u1fed', utf7.decode('&,,,typh2VDIf7Q-'));

  // & sign around non-ASCII chars
  assert.equal('\u00E4&\u00E4&\u00E4', utf7.decode('&AOQ-&-&AOQ-&-&AOQ-'));
});
