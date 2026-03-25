function assertAll (asserts) {
  for (var i = 0; i < asserts.length; i++) {
    var assert   = asserts[i];
    var actual   = assert[0];
    var expected = assert[1];
    var message  = assert[2];
  }
  if (!(actual === expected)) {
    var error = message + " got " + actual + " but expected " + expected;
    throw error;
  }
}