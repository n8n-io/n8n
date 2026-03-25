const Mocha = require("mocha")
const path = require("path"), fs = require("fs"), url = require("url")

exports.gatherTests = function(dirs) {
  let tests = [], browserTests = []
  for (let dir of dirs) {
    let testDir = path.join(dir, "test"), files
    try { files = fs.readdirSync(testDir) }
    catch { continue }
    for (let f of files) {
      let m = /^(web)?test-.*\.js$/.exec(f)
      if (m) (m[1] ? browserTests : tests).push(path.join(testDir, f))
    }
  }
  return {tests, browserTests}
}

class PlainError extends Error {
  get name() { return "" }
}

exports.runTests = async function({tests = [], browserTests = [], browsers = ["chrome"], grep = null}) {
  let mocha = new Mocha
  if (grep) mocha.grep(new RegExp(grep))
  for (let file of tests) mocha.addFile(file)
  await mocha.loadFilesAsync()

  if (browserTests.length && browsers.length) {
    let server = exports.createTestServer({
      files: browserTests,
      root: path.dirname(path.dirname(path.dirname(browserTests[0]))),
      selenium: true
    })
    for (let browser of browsers) {
      let result = await exports.runBrowserTests({files: browserTests, grep, browser, server, grep})
      let suite = Mocha.Suite.create(mocha.suite, `Browser tests (${browser})`)
      let top = {suite, sub: Object.create(null)}
      for (let test of result) {
        if (test.pending) continue
        let scope = top
        for (let sub of test.scope) scope = scope.sub[sub] || (scope.sub[sub] = {
          suite: Mocha.Suite.create(scope.suite, sub),
          sub: Object.create(null)
        })
        scope.suite.addTest(new Mocha.Test(test.name, () => {
          if (test.fail) throw new PlainError(test.fail)
        }))
      }
    }
    server.close()
  }

  return new Promise(r => mocha.run(r))
}

exports.runBrowserTests = async function({files, browser = "chrome", server, grep}) {
  const {Builder, By, until} = require("selenium-webdriver")
  const webdriver = require("selenium-webdriver/" + browser)

  let builder = new Builder().forBrowser(browser).setChromeOptions(new webdriver.Options().headless())
  let driver = await builder.build()
  try {
    let port = server.address().port
    await driver.get(`http://localhost:${port}/${grep ? `?grep=${encodeURIComponent(grep)}` : ''}`)
    let resultNode = await driver.wait(until.elementLocated(By.css("pre.test-result")), 20000)
    return JSON.parse(await resultNode.getAttribute("textContent"))
  } finally {
    driver.quit()
  }
}

exports.createTestServer = function({files, root, port = undefined, selenium = false}) {
  let moduleserver = new (require("esmoduleserve/moduleserver"))({root, maxDepth: 2})
  let serveStatic = require("serve-static")(root)
  return require("http").createServer((req, resp) => {
    let {pathname} = url.parse(req.url), m
    if (pathname == "/") {
      resp.writeHead(200, {"content-type": "text/html; charset=utf-8"})
      resp.end(exports.testHTML(files.map(f => path.relative(root, f)), selenium))
    } else if (m = /^.*\/mocha(\.\w+)$/.exec(pathname)) {
      let base = require.resolve("mocha/mocha")
      let content = fs.readFileSync(base.replace(/\.\w+$/, m[1]), "utf8")
      resp.writeHead(200, {"content-type": (m == ".js" ? "application/javascript" : "text/css") + "; charset=utf-8"})
      resp.end(content)
    } else if (moduleserver.handleRequest(req, resp)) {
      // Handled
    } else {
      serveStatic(req, resp, err => {
        resp.statusCode = 404
        resp.end('Not found')
      })
    }
  }).listen(port)
}

exports.testHTML = function(testFiles, selenium) {
  return `<!doctype html>
<meta charset=utf8>
<title>CodeMirror view tests</title>

<link rel=stylesheet href="mocha.css">

<h1>CodeMirror view tests</h1>

<div id="workspace" style="opacity: 0; position: fixed; top: 0; left: 0; width: 20em;"></div>

<div id=mocha></div>

<script src="mocha.js"></script>
<script>
let output = []
mocha.setup({
  ui: "bdd"${selenium ? `,
  reporter: function(runner) {
    function add(test, data) {
      data.name = test.title
      data.scope = []
      for (let obj = test.parent; obj; obj = obj.parent) data.scope.unshift(obj.title)
      output.push(data)
    }
    runner.on("pass", test => add(test, {}))
    runner.on("fail", (test, err) => add(test, {fail: String(err)}))
    runner.on("pending", test => add(test, {pending: true}))
    runner.once("end", () => {
      let out = document.createElement("pre")
      out.className = "test-result"
      out.textContent = JSON.stringify(output, null, 2)
      document.body.appendChild(out)
    })
  }` : ""}
})
onload = () => mocha.run()
onerror = e => output.push({name: "#" + (output.length + 1), scope: ["Top errors"], fail: String(e)})
</script>
${testFiles.map(f => `<script type=module src="/_m/${f.replace(/\.\.\//g, "__/")}"></script>
`).join("")}`
}
