var codegen = require("..");

// new require("benchmark").Suite().add("add", function() {

var add = codegen(["a", "b"], "add")
  ("// awesome comment")
  ("return a + b - c + %d", 1)
  ({ c: 1 });

if (add(1, 2) !== 3)
  throw Error("failed");

// }).on("cycle", function(event) { process.stdout.write(String(event.target) + "\n"); }).run();
