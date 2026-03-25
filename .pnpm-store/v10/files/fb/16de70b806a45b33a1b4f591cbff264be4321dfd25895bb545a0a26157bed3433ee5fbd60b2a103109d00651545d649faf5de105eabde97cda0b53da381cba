function works(test) {
  try {
    // Wrap the test in a function to only test the syntax, without executing it
    (0, eval)(`(() => { ${test} })`);
    return true;
  } catch (_error) {
    return false;
  }
}

function getPluginsList(tests) {
  const plugins = [];
  for (const [name, cases] of Object.entries(tests)) {
    if (cases.some(works)) {
      plugins.push(require.resolve(`@babel/plugin-syntax-${name}`));
    }
  }
  return plugins;
}

const babel7OnlyPlugins = getPluginsList({
  // ECMAScript 2018
  "object-rest-spread": ["({ ...{} })", "({ ...x } = {})"], // Babel 7.2.0
  "async-generators": ["async function* f() {}"], //  Babel 7.2.0

  // ECMAScript 2019
  "optional-catch-binding": ["try {} catch {}"], // Babel 7.2.0
  "json-strings": ["'\\u2028'"], // Babel 7.2.0

  // ECMAScript 2020
  bigint: ["1n"], // Babel 7.8.0
  "optional-chaining": ["a?.b"], // Babel 7.9.0
  "nullish-coalescing-operator": ["a ?? b"], // Babel 7.9.0
  // import.meta is handled manually

  // ECMAScript 2021
  "numeric-separator": ["1_2"],
  "logical-assignment-operators": ["a ||= b", "a &&= b", "a ??= c"],

  // ECMAScript 2022
  "class-properties": [
    "(class { x = 1 })",
    "(class { #x = 1 })",
    "(class { #x() {} })",
  ],
  "private-property-in-object": ["(class { #x; m() { #x in y } })"],
  "class-static-block": ["(class { static {} })"],
  // top-level await is handled manually

  // Stage 3
  // import attributes is handled manually
});

const commonPlugins = getPluginsList({});

// import.meta is only allowed in modules, and modules can only be evaluated
// synchronously. For this reason, we cannot detect import.meta support at
// runtime. It is supported starting from 10.4, so we can check the version.
const major = parseInt(process.versions.node, 10);
const minor = parseInt(process.versions.node.match(/^\d+\.(\d+)/)[1], 10);
if (major > 10 || (major === 10 && minor >= 4)) {
  babel7OnlyPlugins.push(require.resolve("@babel/plugin-syntax-import-meta"));
}
// Same for top level await - it is only supported in modules. It is supported
// from 14.3.0
if (major > 14 || (major === 14 && minor >= 3)) {
  babel7OnlyPlugins.push(
    require.resolve("@babel/plugin-syntax-top-level-await")
  );
}
// Similar for import attributes
if (
  major > 20 ||
  (major === 20 && minor >= 10) ||
  (major === 18 && minor >= 20)
) {
  babel7OnlyPlugins.push(
    require.resolve("@babel/plugin-syntax-import-attributes")
  );
}

module.exports = ({ version }) => ({
  plugins: version.startsWith("7.")
    ? babel7OnlyPlugins.concat(commonPlugins)
    : commonPlugins,
});
