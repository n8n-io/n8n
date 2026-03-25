/**
 * command line tool
 *
 * @author Zongmin Lei<leizongmin@gmail.com>
 */

var xss = require("./");
var readline = require("readline");

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('Enter a blank line to do xss(), enter "@quit" to exit.\n');

function take(c, n) {
  var ret = "";
  for (var i = 0; i < n; i++) {
    ret += c;
  }
  return ret;
}

function setPrompt(line) {
  line = line.toString();
  rl.setPrompt("[" + line + "]" + take(" ", 5 - line.length));
  rl.prompt();
}

setPrompt(1);

var html = [];
rl.on("line", function (line) {
  if (line === "@quit") return process.exit();
  if (line === "") {
    console.log("");
    console.log(xss(html.join("\r\n")));
    console.log("");
    html = [];
  } else {
    html.push(line);
  }
  setPrompt(html.length + 1);
});
