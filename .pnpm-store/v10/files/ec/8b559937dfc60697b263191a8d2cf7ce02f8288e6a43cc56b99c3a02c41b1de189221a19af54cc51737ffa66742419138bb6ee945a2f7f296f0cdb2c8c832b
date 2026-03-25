import chai from "chai";
import fs from "fs";
import path from "path";
import { FunctionCov, mergeFunctionCovs, mergeProcessCovs, mergeScriptCovs, ProcessCov, ScriptCov } from "../lib";

const REPO_ROOT: string = path.join(__dirname, "..", "..", "..", "..");
const BENCHES_INPUT_DIR: string = path.join(REPO_ROOT, "benches");
const BENCHES_DIR: string = path.join(REPO_ROOT, "test-data", "merge", "benches");
const RANGES_DIR: string = path.join(REPO_ROOT, "test-data", "merge", "ranges");
const BENCHES_TIMEOUT: number = 20000; // 20sec

interface MergeRangeItem {
  name: string;
  status: "run" | "skip" | "only";
  inputs: ProcessCov[];
  expected: ProcessCov;
}

const FIXTURES_DIR: string = path.join(REPO_ROOT, "test-data", "bugs");
function loadFixture(name: string) {
  const content: string = fs.readFileSync(
    path.resolve(FIXTURES_DIR, `${name}.json`),
    {encoding: "UTF-8"},
  );
  return JSON.parse(content);
}

describe("merge", () => {
  describe("Various", () => {
    it("accepts empty arrays for `mergeProcessCovs`", () => {
      const inputs: ProcessCov[] = [];
      const expected: ProcessCov = {result: []};
      const actual: ProcessCov = mergeProcessCovs(inputs);
      chai.assert.deepEqual(actual, expected);
    });

    it("accepts empty arrays for `mergeScriptCovs`", () => {
      const inputs: ScriptCov[] = [];
      const expected: ScriptCov | undefined = undefined;
      const actual: ScriptCov | undefined = mergeScriptCovs(inputs);
      chai.assert.deepEqual(actual, expected);
    });

    it("accepts empty arrays for `mergeFunctionCovs`", () => {
      const inputs: FunctionCov[] = [];
      const expected: FunctionCov | undefined = undefined;
      const actual: FunctionCov | undefined = mergeFunctionCovs(inputs);
      chai.assert.deepEqual(actual, expected);
    });

    it("accepts arrays with a single item for `mergeProcessCovs`", () => {
      const inputs: ProcessCov[] = [
        {
          result: [
            {
              scriptId: "123",
              url: "/lib.js",
              functions: [
                {
                  functionName: "test",
                  isBlockCoverage: true,
                  ranges: [
                    {startOffset: 0, endOffset: 4, count: 2},
                    {startOffset: 1, endOffset: 2, count: 1},
                    {startOffset: 2, endOffset: 3, count: 1},
                  ],
                },
              ],
            },
          ],
        },
      ];
      const expected: ProcessCov = {
        result: [
          {
            scriptId: "0",
            url: "/lib.js",
            functions: [
              {
                functionName: "test",
                isBlockCoverage: true,
                ranges: [
                  {startOffset: 0, endOffset: 4, count: 2},
                  {startOffset: 1, endOffset: 3, count: 1},
                ],
              },
            ],
          },
        ],
      };
      const actual: ProcessCov = mergeProcessCovs(inputs);
      chai.assert.deepEqual(actual, expected);
    });

    describe("mergeProcessCovs", () => {
      // see: https://github.com/demurgos/v8-coverage/issues/2
      it("handles function coverage merged into block coverage", () => {
        const blockCoverage: ProcessCov = loadFixture("issue-2-block-coverage");
        const functionCoverage: ProcessCov = loadFixture("issue-2-func-coverage");
        const inputs: ProcessCov[] = [
          functionCoverage,
          blockCoverage,
        ];
        const expected: ProcessCov = loadFixture("issue-2-expected");
        const actual: ProcessCov = mergeProcessCovs(inputs);
        chai.assert.deepEqual(actual, expected);
      });

      // see: https://github.com/demurgos/v8-coverage/issues/2
      it("handles block coverage merged into function coverage", () => {
        const blockCoverage: ProcessCov = loadFixture("issue-2-block-coverage");
        const functionCoverage: ProcessCov = loadFixture("issue-2-func-coverage");
        const inputs: ProcessCov[] = [
          blockCoverage,
          functionCoverage,
        ];
        const expected: ProcessCov = loadFixture("issue-2-expected");
        const actual: ProcessCov = mergeProcessCovs(inputs);
        chai.assert.deepEqual(actual, expected);
      });
    });

    it("accepts arrays with a single item for `mergeScriptCovs`", () => {
      const inputs: ScriptCov[] = [
        {
          scriptId: "123",
          url: "/lib.js",
          functions: [
            {
              functionName: "test",
              isBlockCoverage: true,
              ranges: [
                {startOffset: 0, endOffset: 4, count: 2},
                {startOffset: 1, endOffset: 2, count: 1},
                {startOffset: 2, endOffset: 3, count: 1},
              ],
            },
          ],
        },
      ];
      const expected: ScriptCov | undefined = {
        scriptId: "123",
        url: "/lib.js",
        functions: [
          {
            functionName: "test",
            isBlockCoverage: true,
            ranges: [
              {startOffset: 0, endOffset: 4, count: 2},
              {startOffset: 1, endOffset: 3, count: 1},
            ],
          },
        ],
      };
      const actual: ScriptCov | undefined = mergeScriptCovs(inputs);
      chai.assert.deepEqual(actual, expected);
    });

    it("accepts arrays with a single item for `mergeFunctionCovs`", () => {
      const inputs: FunctionCov[] = [
        {
          functionName: "test",
          isBlockCoverage: true,
          ranges: [
            {startOffset: 0, endOffset: 4, count: 2},
            {startOffset: 1, endOffset: 2, count: 1},
            {startOffset: 2, endOffset: 3, count: 1},
          ],
        },
      ];
      const expected: FunctionCov = {
        functionName: "test",
        isBlockCoverage: true,
        ranges: [
          {startOffset: 0, endOffset: 4, count: 2},
          {startOffset: 1, endOffset: 3, count: 1},
        ],
      };
      const actual: FunctionCov | undefined = mergeFunctionCovs(inputs);
      chai.assert.deepEqual(actual, expected);
    });
  });

  describe("ranges", () => {
    for (const sourceFile of getSourceFiles()) {
      const relPath: string = path.relative(RANGES_DIR, sourceFile);
      describe(relPath, () => {
        const content: string = fs.readFileSync(sourceFile, {encoding: "UTF-8"});
        const items: MergeRangeItem[] = JSON.parse(content);
        for (const item of items) {
          const test: () => void = () => {
            const actual: ProcessCov | undefined = mergeProcessCovs(item.inputs);
            chai.assert.deepEqual(actual, item.expected);
          };
          switch (item.status) {
            case "run":
              it(item.name, test);
              break;
            case "only":
              it.only(item.name, test);
              break;
            case "skip":
              it.skip(item.name, test);
              break;
            default:
              throw new Error(`Unexpected status: ${item.status}`);
          }
        }
      });
    }
  });

  describe("benches", () => {
    for (const bench of getBenches()) {
      const BENCHES_TO_SKIP: Set<string> = new Set();
      if (process.env.CI === "true") {
        // Skip very large benchmarks when running continuous integration
        BENCHES_TO_SKIP.add("node@10.11.0");
        BENCHES_TO_SKIP.add("npm@6.4.1");
      }

      const name: string = path.basename(bench);

      if (BENCHES_TO_SKIP.has(name)) {
        it.skip(`${name} (skipped: too large for CI)`, testBench);
      } else {
        it(name, testBench);
      }

      async function testBench(this: Mocha.Context) {
        this.timeout(BENCHES_TIMEOUT);

        const inputFileNames: string[] = await fs.promises.readdir(bench);
        const inputPromises: Promise<ProcessCov>[] = [];
        for (const inputFileName of inputFileNames) {
          const resolved: string = path.join(bench, inputFileName);
          inputPromises.push(fs.promises.readFile(resolved).then(buffer => JSON.parse(buffer.toString("UTF-8"))));
        }
        const inputs: ProcessCov[] = await Promise.all(inputPromises);
        const expectedPath: string = path.join(BENCHES_DIR, `${name}.json`);
        const expectedContent: string = await fs.promises.readFile(expectedPath, {encoding: "UTF-8"}) as string;
        const expected: ProcessCov = JSON.parse(expectedContent);
        const startTime: number = Date.now();
        const actual: ProcessCov | undefined = mergeProcessCovs(inputs);
        const endTime: number = Date.now();
        console.error(`Time (${name}): ${(endTime - startTime) / 1000}`);
        chai.assert.deepEqual(actual, expected);
        console.error(`OK: ${name}`);
      }
    }
  });
});

function getSourceFiles() {
  return getSourcesFrom(RANGES_DIR);

  function* getSourcesFrom(dir: string): Iterable<string> {
    const names: string[] = fs.readdirSync(dir);
    for (const name of names) {
      const resolved: string = path.join(dir, name);
      const stat: fs.Stats = fs.statSync(resolved);
      if (stat.isDirectory()) {
        yield* getSourcesFrom(dir);
      } else {
        yield resolved;
      }
    }
  }
}

function* getBenches(): Iterable<string> {
  const names: string[] = fs.readdirSync(BENCHES_INPUT_DIR);
  for (const name of names) {
    const resolved: string = path.join(BENCHES_INPUT_DIR, name);
    const stat: fs.Stats = fs.statSync(resolved);
    if (stat.isDirectory()) {
      yield resolved;
    }
  }
}
