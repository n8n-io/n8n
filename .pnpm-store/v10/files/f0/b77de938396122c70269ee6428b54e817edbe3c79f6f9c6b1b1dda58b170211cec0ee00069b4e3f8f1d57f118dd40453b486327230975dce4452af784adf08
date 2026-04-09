import { parseFiles } from "@ast-grep/napi";
import { chalk, fs, path } from "zx";
import { errors } from "./errors.js";
import { root } from "./utils.js";

/**
 * @typedef {import("@ast-grep/napi").SgNode} SgNode
 */

/**
 * Prepend text to a node
 * @param {SgNode} node
 * @param {string} text
 * @returns {import("@ast-grep/napi").Edit}
 */
function prepend(node, text) {
    const index = node.range().start.index;
    return {
        startPos: index,
        endPos: index,
        insertedText: text,
    };
}

export function ast_grep() {
    const task_queue = [];

    const task = parseFiles([root("esm")], (err, tree) => {
        const filename = path.basename(tree.filename(), ".js");
        if (filename === "index") {
            return;
        }

        const root_node = tree.root();
        const edits = [];

        edits.push(prepend(root_node, `"use strict";\n\n`));

        // We have forked _ts_generator from tslib
        if (filename.startsWith("_ts") && filename !== "_ts_generator") {
            const match = root_node.find(`export { $NAME as _ } from "tslib"`);
            if (match) {
                const name = match.getMatch("NAME").text();
                edits.push(
                    match.replace(`exports._ = require("tslib").${name};`),
                );
                task_queue.push(
                    fs.writeFile(root("cjs", `${filename}.cjs`), root_node.commitEdits(edits), {
                        encoding: "utf-8",
                    }),
                );
            } else {
                report_noexport(tree.filename());
            }
            return;
        }

        // rewrite export named function
        const match = root_node.find({
            rule: {
                kind: "export_statement",
                pattern: "export { $FUNC as _ }",
            },
        });

        if (match) {
            const func = match.getMatch("FUNC");
            const func_name = func.text();
            if (func_name !== filename) {
                report_export_mismatch(tree.filename(), match);
            }

            edits.push(
                match.replace(`exports._ = ${func_name};`),
            );

            // since we match the { export x as _ } pattern,
            // we need to find the assignment expression from the root
            root_node
                .findAll({
                    rule: {
                        pattern: func_name,
                        kind: "identifier",
                        inside: { kind: "assignment_expression", field: "left" },
                    },
                })
                .forEach((node) => {
                    edits.push(
                        prepend(node, `exports._ = `),
                    );
                });
        } else {
            report_noexport(tree.filename());
        }

        // rewrite import
        root_node
            .findAll({ rule: { pattern: `import { _ as $BINDING } from "$SOURCE"` } })
            .forEach((match) => {
                const import_binding = match.getMatch("BINDING").text();
                const import_source = match.getMatch("SOURCE").text();

                const import_basename = path.basename(import_source, ".js");

                if (import_binding !== import_basename) {
                    report_import_mismatch(tree.filename(), match);
                }

                edits.push(
                    match.replace(`var ${import_binding} = require("./${import_binding}.cjs");`),
                );

                root_node
                    .findAll({
                        rule: {
                            pattern: import_binding,
                            kind: "identifier",
                            inside: {
                                not: {
                                    kind: "import_specifier",
                                },
                            },
                        },
                    })
                    .forEach((node) => {
                        edits.push(
                            node.replace(`${node.text()}._`),
                        );
                    });
            });

        task_queue.push(
            fs.writeFile(root("cjs", `${filename}.cjs`), root_node.commitEdits(edits), {
                encoding: "utf-8",
            }),
        );
    });

    task_queue.push(task);

    return task_queue;
}

/**
 * @param {string} filename
 * @param {SgNode} match
 */
function report_export_mismatch(filename, match) {
    const func = match.getMatch("FUNC");
    const func_range = func.range();

    const text = match.text().split("\n");
    const offset = func_range.start.line - match.range().start.line;

    text.splice(
        offset + 1,
        text.length,
        chalk.red(
            [
                " ".repeat(func_range.start.column),
                "^".repeat(func_range.end.column - func_range.start.column),
            ]
                .join(""),
        ),
    );

    errors.push(
        [
            `${chalk.bold.red("error")}: mismatch exported function name.`,
            "",
            `${chalk.blue("-->")} ${filename}:${func_range.start.line + 1}:${func_range.start.column + 1}`,
            "",
            ...text,
            "",
            `${chalk.bold("note:")} The exported name should be the same as the filename.`,
            "",
        ]
            .join("\n"),
    );
}

/**
 * @param {string} filename
 * @param {SgNode} match
 */
function report_import_mismatch(filename, match) {
    const binding_range = match.getMatch("BINDING").range();
    const source_range = match.getMatch("SOURCE").range();

    errors.push(
        [
            `${chalk.bold.red("error")}: mismatch imported binding name.`,
            "",
            `${chalk.blue("-->")} ${filename}:${match.range().start.line + 1}`,
            "",
            match.text(),
            [
                " ".repeat(binding_range.start.column),
                chalk.red("^".repeat(binding_range.end.column - binding_range.start.column)),
                " ".repeat(source_range.start.column - binding_range.end.column),
                chalk.blue("-".repeat(source_range.end.column - source_range.start.column)),
            ]
                .join(""),
            `${chalk.bold("note:")} The imported binding name should be the same as the import source basename.`,
            "",
        ]
            .join("\n"),
    );
}

/**
 * @param {string} filename
 */
function report_noexport(filename) {
    errors.push(
        [`${chalk.bold.red("error")}: exported name not found`, `${chalk.blue("-->")} ${filename}`].join("\n"),
    );
}
