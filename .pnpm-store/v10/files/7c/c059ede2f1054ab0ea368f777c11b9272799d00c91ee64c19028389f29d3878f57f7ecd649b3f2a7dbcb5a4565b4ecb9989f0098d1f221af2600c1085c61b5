function shortenRgb(red, green, blue) {
  var normalizedRed = Math.max(0, Math.min(parseInt(red), 255));
  var normalizedGreen = Math.max(0, Math.min(parseInt(green), 255));
  var normalizedBlue = Math.max(0, Math.min(parseInt(blue), 255));

  // Credit: Asen  http://jsbin.com/UPUmaGOc/2/edit?js,console
  return '#' + ('00000' + (normalizedRed << 16 | normalizedGreen << 8 | normalizedBlue).toString(16)).slice(-6);
}

module.exports = shortenRgb;
