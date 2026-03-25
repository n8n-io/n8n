#!/usr/bin/env node

import { exec } from "child_process";
import fs from "fs";
import net from "net";
import path from "path";
import { promisify } from "util";

import colors from "colors";
import { diffLines } from "diff";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { parse } from "../src/parse.js";
import { fixturesDir, converters } from "../test/test-utils.js";

const awaitableExec = promisify(exec);

const DEFAULT_PORT = 28139; // chosen randomly
const EXPECTED_URL = "localhost:" + DEFAULT_PORT;

const MINIMAL_HTTP_RESPONSE = `\
HTTP/1.1 200 OK
Content-Length: 12
Content-Type: text/plain; charset=utf-8

Hello World!`.replace(/\n/g, "\r\n");

const testDir = "/tmp/curlconverter"; // files are copied here to be executed
const executables = {
  clojure: {
    copy: "cp <file> /tmp/curlconverter/clojure/main.clj",
    exec: 'cd /tmp/curlconverter/clojure && clj -Sdeps \'{:deps {clj-http/clj-http {:mvn/version "3.12.3"} cheshire/cheshire {:mvn/version "5.11.0"}}}\' -M main.clj',
  },
  csharp: {
    setup:
      "cd /tmp/curlconverter && dotnet new console -o csharp && sed -i '' 's/<ImplicitUsings>enable/<ImplicitUsings>disable/' /tmp/curlconverter/csharp/csharp.csproj",
    copy: "cp <file> /tmp/curlconverter/csharp/Program.cs",
    exec: "cd /tmp/curlconverter/csharp && dotnet run",
  },
  dart: {
    setup:
      "cd /tmp && mkdir -p curlconverter/dart && cd /tmp/curlconverter/dart && echo $'name:\\n  dart\\nenvironment:\\n  sdk: \">=2.14.0\"\\ndependencies:\\n  http: any\\n' > pubspec.yaml && dart pub get",
    copy: "cp <file> /tmp/curlconverter/dart/main.dart",
    exec: "cd /tmp/curlconverter/dart && dart run main.dart",
  },
  elixir: {
    setup:
      "mix new /tmp/curlconverter/elixircurlconverter/ && sed -i '' 's/# {:dep_from_hexpm, \"~> 0.3.0\"}/{:httpoison, \"~> 1.8\"}/g' /tmp/curlconverter/elixirelixircurlconverter/mix.exs && cd /tmp/curlconverter/elixirelixircurlconverter/ && mix deps.get",
    copy: "cp <file> /tmp/curlconverter/elixirelixircurlconverter/main.ex",
    exec: "cd /tmp/curlconverter/elixirelixircurlconverter && mix run main.ex",
    dir: "elixircurlconverter",
  },
  go: {
    copy: "go build -o /tmp/curlconverter/go/go <file>",
    exec: "cd /tmp/curlconverter/go && /tmp/curlconverter/go/go",
  },
  httpie: {
    copy: function (contents: string) {
      fs.writeFileSync(
        "/tmp/curlconverter/httpie/main",
        contents.trimEnd() + " --ignore-stdin" + "\n",
        "utf8",
      );
    },
    exec: "chmod +x /tmp/curlconverter/httpie/main && /tmp/curlconverter/httpie/main",
  },
  java: {
    copy: function (contents: string) {
      const [imports, ...rest] = contents.split("\n\n");

      fs.writeFileSync(
        "/tmp/curlconverter/java/Main.java",
        imports +
          "\n\n" +
          "public class Main {\n" +
          "  public static void main(String[] args) throws Exception {\n" +
          "    " +
          rest.join("\n\n") +
          "\n" +
          "  }\n" +
          "}\n",
        "utf8",
      );
    },
    exec: "cd /tmp/curlconverter/java && javac Main.java && java Main",
  },
  "java-httpurlconnection": {
    copy: "cp <file> /tmp/curlconverter/java-httpurlconnection/Main.java",
    exec: "cd /tmp/curlconverter/java-httpurlconnection && javac Main.java && java Main",
  },
  "java-jsoup": {
    setup:
      "if [ ! -d /tmp/curlconverter/java-jsoup ]; then echo setup java-jsoup by hand. && exit 1; fi",
    // Like this:
    // cd /tmp/curlconverter && mvn archetype:generate -DgroupId=com.mycompany.app -DartifactId=java-jsoup -DarchetypeArtifactId=maven-archetype-quickstart -DarchetypeVersion=1.4 -DinteractiveMode=false
    // cd java-jsoup
    // then manually edit java-jsoup/pom.xml to fix the version of Java:

    // <properties>
    //   <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    //   <maven.compiler.source>18</maven.compiler.source>
    //   <maven.compiler.target>18</maven.compiler.target>
    // </properties>

    // and to install jsoup:

    // <dependencies>
    //   <dependency>
    //     <groupId>org.jsoup</groupId>
    //     <artifactId>jsoup</artifactId>
    //     <version>1.16.1</version>
    //   </dependency>
    // </dependencies>

    // then install:
    // mvn install

    // setup: "cd /tmp/curlconverter && mvn archetype:generate -DgroupId=com.mycompany.app -DartifactId=java-jsoup -DarchetypeArtifactId=maven-archetype-quickstart -DarchetypeVersion=1.4 -DinteractiveMode=false",
    copy: function (contents: string) {
      fs.writeFileSync(
        "/tmp/curlconverter/java-jsoup/src/main/java/com/mycompany/app/Main.java",
        `package com.mycompany.app;\n\n` +
          contents.replace("class Main", "public class Main"),
        "utf8",
      );
    },
    exec: "cd /tmp/curlconverter/java-jsoup && mvn compile && mvn exec:java -Dexec.mainClass=com.mycompany.app.Main",
  },
  // mkdir -p /tmp/curlconverter/java-okhttp && cd /tmp/curlconverter/java-okhttp && curl https://repo1.maven.org/maven2/com/squareup/okhttp3/okhttp/4.11.0/okhttp-4.11.0.jar > okhttp-4.11.0.jar
  // "java-okhttp": {
  //   setup: "mkdir -p /tmp/curlconverter/java-okhttp && cd /tmp/curlconverter/java-okhttp",
  //   copy: "cp <file> /tmp/curlconverter/java-okhttp/Main.java",
  //   exec: "cd /tmp/curlconverter/java-okhttp && javac -cp okhttp-4.11.0.jar Main.java && java Main",
  // },
  // javascript:
  "javascript-jquery": {
    setup:
      "cd /tmp && mkdir -p curlconverter/javascript-jquery && cd curlconverter/javascript-jquery && npm init -y es6 && npm install jquery jsdom",
    copy: function (contents: string) {
      fs.writeFileSync(
        "/tmp/curlconverter/javascript-jquery/main.js",
        `import { JSDOM } from 'jsdom';
const { window } = new JSDOM();
import jQueryInit from 'jquery';
var $ = jQueryInit(window);

` + contents,
        "utf8",
      );
    },
    exec: "cd /tmp/curlconverter/javascript-jquery && node main.js",
  },
  "javascript-xhr": {
    setup:
      "cd /tmp && mkdir -p curlconverter/javascript-xhr && cd curlconverter/javascript-xhr && npm init -y es6 && npm install xmlhttprequest",
    copy: function (contents: string) {
      fs.writeFileSync(
        "/tmp/curlconverter/javascript-xhr/main.js",
        "import { XMLHttpRequest } from 'xmlhttprequest';\n\n" + contents,
        "utf8",
      );
    },
    exec: "cd /tmp/curlconverter/javascript-xhr && node main.js",
  },
  julia: {
    exec: "julia <file>",
  },
  kotlin: {
    copy: function (contents: string) {
      fs.writeFileSync(
        "/tmp/curlconverter/kotlin/script.main.kts",
        '@file:DependsOn("com.squareup.okhttp3:okhttp:4.11.0")\n\n' + contents,
        "utf8",
      );
    },
    exec: "cd /tmp/curlconverter/kotlin && kotlin script.main.kts",
  },
  lua: {
    exec: "lua <file>",
  },
  node: {
    setup:
      "cd /tmp && mkdir -p curlconverter/node && cd curlconverter/node && npm init -y es6 && npm install node-fetch",
    copy: "cp <file> /tmp/curlconverter/node/main.js",
    exec: "cd /tmp/curlconverter/node && node main.js",
  },
  "node-axios": {
    setup:
      "cd /tmp && mkdir -p curlconverter/node-axios && cd curlconverter/node-axios && npm init -y es6 && npm install axios form-data",
    copy: "cp <file> /tmp/curlconverter/node-axios/main.js",
    exec: "cd /tmp/curlconverter/node-axios && node main.js",
  },
  "node-http": {
    setup:
      "cd /tmp && mkdir -p curlconverter/node-http && cd curlconverter/node-http && npm init -y es6 && npm install form-data",
    copy: function (contents: string) {
      fs.writeFileSync(
        "/tmp/curlconverter/node-http/main.js",
        contents.replace(
          "hostname: 'localhost:28139',",
          "hostname: 'localhost', port: 28139,",
        ),
        "utf8",
      );
    },
    exec: "cd /tmp/curlconverter/node-http && node main.js",
  },
  "node-superagent": {
    setup:
      "cd /tmp && mkdir -p curlconverter/node-superagent && cd curlconverter/node-superagent && npm init -y es6 && npm install superagent",
    copy: "cp <file> /tmp/curlconverter/node-superagent/main.js",
    exec: "cd /tmp/curlconverter/node-superagent && node main.js",
  },
  objectivec: {
    copy: function (contents: string) {
      fs.writeFileSync(
        "/tmp/curlconverter/objectivec/main.m",
        contents
          .replace(
            "#import <Foundation/Foundation.h>\n",
            "#import <Foundation/Foundation.h>\n" +
              "\n" +
              "int main(int argc, const char * argv[]) {\n" +
              "    @autoreleasepool {\n",
          )
          .replace(
            "NSURLSession *session = ",
            "\ndispatch_semaphore_t semaphore = dispatch_semaphore_create(0);\nNSURLSession *session = ",
          )
          .replace(
            '        NSLog(@"%@", httpResponse);\n' + "    }\n",
            '        NSLog(@"%@", httpResponse);\n' +
              "    }\n" +
              "dispatch_semaphore_signal(semaphore);\n",
          ) +
          "dispatch_semaphore_wait(semaphore, DISPATCH_TIME_FOREVER);\n" +
          "    }\n" +
          "    return 0;\n" +
          "}\n",
        "utf8",
      );
    },
    exec: "cd /tmp/curlconverter/objectivec && clang -framework Foundation main.m -o main && ./main",
  },
  ocaml: {
    copy: function (contents: string) {
      fs.writeFileSync(
        "/tmp/curlconverter/ocaml/main.ml",
        contents
          .replace(
            "\nlet uri = Uri.of_string ",
            "let body =\nlet uri = Uri.of_string ",
          )
          .replace(
            "  (* Do stuff with the result *)\n",
            "  body |> Cohttp_lwt.Body.to_string\n" +
              "\n" +
              "" +
              "let () =\n" +
              "  let body = Lwt_main.run body in\n" +
              "  print_endline body\n",
          ),
        "utf8",
      );
    },
    exec: "cd /tmp/curlconverter/ocaml && eval `opam config env` && ocamlbuild -use-ocamlfind -tag thread -pkg cohttp-lwt-unix main.native && ./main.native",
  },
  perl: {
    exec: "perl <file>",
  },
  php: {
    exec: "php <file>",
  },
  // php composer.phar global require guzzlehttp/guzzle:^7.0
  "php-guzzle": {
    setup:
      "cd /tmp && mkdir -p curlconverter/php-guzzle && cd curlconverter/php-guzzle && php composer.phar require guzzlehttp/guzzle:^7.0",
    copy: "cp <file> /tmp/curlconverter/php-guzzle/main.php",
    exec: "cd /tmp/curlconverter/php-guzzle && php main.php",
  },
  powershell: {
    copy: "cp <file> /tmp/curlconverter/powershell/main.ps1",
    exec: "cd /tmp/curlconverter/powershell && pwsh main.ps1",
  },
  python: {
    exec: "python3 <file>",
  },
  r: {
    exec: "r < <file> --no-save",
  },
  "r-httr2": {
    exec: "r < <file> --no-save",
  },
  ruby: {
    exec: "ruby <file>",
  },
  "ruby-httparty": {
    exec: "ruby <file>",
  },
  rust: {
    setup:
      "cd /tmp && cargo init --vcs none /tmp/curlconverter/rust && cd /tmp/curlconverter/rust && cargo add reqwest --features reqwest/blocking,reqwest/json",
    copy: "cp <file> /tmp/curlconverter/rust/src/main.rs",
    exec: "cd /tmp/curlconverter/rust && cargo run",
  },
  swift: {
    copy: function (contents: string) {
      fs.writeFileSync(
        "/tmp/curlconverter/swift/main.swift",
        contents
          .replace(
            "import Foundation\n",
            "import Foundation\n\n// testing\nlet group = DispatchGroup()\ngroup.enter()\n",
          )
          .replace(
            'print(str ?? "")\n    }\n',
            'print(str ?? "")\n    }\n\n    // testing\n    group.leave()\n',
          ) +
          `
// testing
group.notify(queue: .main) {
  exit(EXIT_SUCCESS) // Exit program when done
}
dispatchMain()\n`,

        "utf8",
      );
    },
    exec: "cd /tmp/curlconverter/swift && swift main.swift",
  },
  wget: {
    exec: "bash <file>",
  },
} as const;

const argv = await yargs(hideBin(process.argv))
  .scriptName("compare-request")
  .usage("Usage: $0 [--no-diff] [-l <language>] [test_name...]")
  .option("diff", {
    describe: "print a colorized diff instead of the raw requests",
    default: true,
    demandOption: false,
    type: "boolean",
  })
  .option("sort", {
    describe: "sort lines before comparing them",
    default: false,
    demandOption: false,
    type: "boolean",
  })
  .option("l", {
    alias: "language",
    describe: "the language of the generated program to compare against",
    choices: Object.keys(executables),
    default: ["python"],
    demandOption: false,
    type: "string",
  })
  .alias("h", "help")
  .help()
  .parse();

const languages: (keyof typeof executables)[] = Array.isArray(argv.language)
  ? argv.language
  : [argv.language];

const testFile = async (
  testFilename: string,
  languages: (keyof typeof executables)[],
): Promise<void> => {
  const rawRequests: string[] = [];

  // TODO: this is flaky
  const server = net.createServer();
  server.on("connection", (socket) => {
    socket.setEncoding("utf8");

    // Timeout very quickly because we only care about recieving the sent request.
    socket.setTimeout(800, () => {
      socket.end();
    });

    socket.on("data", (data) => {
      // TODO: this is not a Buffer, it's a string...
      rawRequests.push((data as unknown as string).replace(/\r\n/g, "\n"));

      if (!socket.write(MINIMAL_HTTP_RESPONSE)) {
        socket.pause();
      }
    });

    socket.on("drain", () => {
      socket.resume();
    });
    socket.on("timeout", () => {
      socket.end();
    });
    socket.on("close", (error) => {
      if (error) {
        console.error("transmission error");
      }
    });
    setTimeout(() => {
      socket.destroy();
    }, 1000);
  });

  server.maxConnections = 1;
  server.listen(DEFAULT_PORT);
  // setTimeout(function(){
  //   server.close();
  // }, 5000);

  const inputFile = path.join(
    fixturesDir,
    "curl_commands",
    testFilename + ".sh",
  );
  if (!fs.existsSync(inputFile)) {
    server.close();
    throw new Error("input file doesn't exist: " + inputFile);
  }
  const curlCommand = fs.readFileSync(inputFile, "utf8");
  const requestedUrl = parse(curlCommand)[0]
    .urls[0].url.replace("http://", "")
    .toString();
  if (!requestedUrl.startsWith(EXPECTED_URL)) {
    console.error("bad requested URL for " + testFilename);
    console.error("  " + requestedUrl);
    console.error("it needs to request");
    console.error("  http://" + EXPECTED_URL);
    console.error("so we can capture the data it sends.");
    server.close();
    return;
  }
  try {
    await awaitableExec("bash " + inputFile);
  } catch (e) {}

  const files = languages.map((l: keyof typeof executables) =>
    path.join(fixturesDir, l, testFilename + converters[l].extension),
  );
  for (let i = 0; i < languages.length; i++) {
    const language = languages[i];
    const languageFile = files[i];
    const executable = executables[language];
    if (fs.existsSync(languageFile)) {
      if ("copy" in executable) {
        if (typeof executable.copy === "function") {
          executable.copy(fs.readFileSync(languageFile).toString());
        } else {
          await awaitableExec(executable.copy.replace("<file>", languageFile));
        }
      }
      // TODO: escape?
      const command = executable.exec.replace("<file>", languageFile);
      try {
        await awaitableExec(command);
      } catch (e) {
        // Uncomment for debugging. An error can happen because
        // our server responds with a generic response.
        console.error(e);
      }
    } else {
      console.error(
        language + " file doesn't exist, skipping: " + languageFile,
      );
    }
  }

  // TODO: allow ignoring headers for each converter
  function sortLines(a: string): string {
    return (
      a
        .split("\n")
        .filter(Boolean)
        .filter((s) => !s.toLowerCase().startsWith("user-agent: "))
        .sort(Intl.Collator().compare)
        .join("\n") + "\n"
    );
  }

  const requestName = path.parse(inputFile).name;
  console.log(requestName);
  console.log("=".repeat(requestName.length));
  console.log(fs.readFileSync(inputFile).toString());
  for (const f of files) {
    if (fs.existsSync(f)) {
      console.log("=".repeat(requestName.length));
      console.log(fs.readFileSync(f).toString());
    }
  }
  console.log("=".repeat(requestName.length));

  const [curlRequest, ...languageRequests] = rawRequests;
  for (const languageRequest of languageRequests) {
    if (argv.diff) {
      const a = argv.sort ? sortLines(curlRequest) : curlRequest;
      const b = argv.sort ? sortLines(languageRequest) : languageRequest;
      for (const part of diffLines(a, b)) {
        // green for additions, red for deletions
        // grey for common parts
        const color = part.added ? "green" : part.removed ? "red" : "grey";
        process.stdout.write(colors[color](part.value));
      }
    } else {
      console.log(curlRequest);
      console.log(languageRequest);
    }
  }
  console.log();

  server.close();
};

// if no tests were specified, run them all
const tests = argv._;
if (!tests.length) {
  const possibleTestFiles = fs
    .readdirSync(path.join(fixturesDir, "curl_commands"))
    .filter((n) => n.endsWith(".sh"));
  for (const testFile of possibleTestFiles) {
    for (const l of languages) {
      if (
        fs.existsSync(
          path.join(
            fixturesDir,
            l,
            testFile.replace(".sh", converters[l].extension),
          ),
        )
      ) {
        tests.push(testFile);
        break;
      }
    }
  }
  if (!tests.length) {
    console.error("no tests found");
    process.exit(1);
  }
}

// fs.rmSync(testDir, { recursive: true, force: true });
if (tests.length) {
  for (const l of languages) {
    const executable = executables[l];
    let dir: string = l;
    if ("dir" in executable) {
      dir = executable.dir;
    }
    fs.mkdirSync(path.join(testDir, dir), { recursive: true });
    if ("setup" in executable) {
      console.error("running");
      console.error(executable.setup);
      await awaitableExec(executable.setup);
      console.error();
    }
  }
}
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
for (const test of tests.sort()) {
  const testName = path.parse(test.toString()).name;
  await testFile(testName, languages);
  await delay(1000);
}

process.exit(0);
