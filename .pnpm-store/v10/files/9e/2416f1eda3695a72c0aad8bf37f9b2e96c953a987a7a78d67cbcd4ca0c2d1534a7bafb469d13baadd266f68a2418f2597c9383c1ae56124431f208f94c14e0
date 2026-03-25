/*
 Copyright 2012-2015, Yahoo Inc.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE
 file for terms.
 */
'use strict';
const { ReportBase } = require('istanbul-lib-report');

const NAME_COL = 4;
const PCT_COLS = 7;
const MISSING_COL = 17;
const TAB_SIZE = 1;
const DELIM = ' | ';

function padding(num, ch) {
    let str = '';
    let i;
    ch = ch || ' ';
    for (i = 0; i < num; i += 1) {
        str += ch;
    }
    return str;
}

function fill(str, width, right, tabs) {
    tabs = tabs || 0;
    str = String(str);

    const leadingSpaces = tabs * TAB_SIZE;
    const remaining = width - leadingSpaces;
    const leader = padding(leadingSpaces);
    let fmtStr = '';

    if (remaining > 0) {
        const strlen = str.length;
        let fillStr;

        if (remaining >= strlen) {
            fillStr = padding(remaining - strlen);
        } else {
            fillStr = '...';
            const length = remaining - fillStr.length;

            str = str.substring(strlen - length);
            right = true;
        }
        fmtStr = right ? fillStr + str : str + fillStr;
    }

    return leader + fmtStr;
}

function formatName(name, maxCols, level) {
    return fill(name, maxCols, false, level);
}

function formatPct(pct, width) {
    return fill(pct, width || PCT_COLS, true, 0);
}

function nodeMissing(node) {
    if (node.isSummary()) {
        return '';
    }

    const metrics = node.getCoverageSummary();
    const isEmpty = metrics.isEmpty();
    const lines = isEmpty ? 0 : metrics.lines.pct;

    let coveredLines;

    const fileCoverage = node.getFileCoverage();
    if (lines === 100) {
        const branches = fileCoverage.getBranchCoverageByLine();
        coveredLines = Object.entries(branches).map(([key, { coverage }]) => [
            key,
            coverage === 100
        ]);
    } else {
        coveredLines = Object.entries(fileCoverage.getLineCoverage());
    }

    let newRange = true;
    const ranges = coveredLines
        .reduce((acum, [line, hit]) => {
            if (hit) newRange = true;
            else {
                line = parseInt(line);
                if (newRange) {
                    acum.push([line]);
                    newRange = false;
                } else acum[acum.length - 1][1] = line;
            }

            return acum;
        }, [])
        .map(range => {
            const { length } = range;

            if (length === 1) return range[0];

            return `${range[0]}-${range[1]}`;
        });

    return [].concat(...ranges).join(',');
}

function nodeName(node) {
    return node.getRelativeName() || 'All files';
}

function depthFor(node) {
    let ret = 0;
    node = node.getParent();
    while (node) {
        ret += 1;
        node = node.getParent();
    }
    return ret;
}

function nullDepthFor() {
    return 0;
}

function findWidth(node, context, nodeExtractor, depthFor = nullDepthFor) {
    let last = 0;
    function compareWidth(node) {
        last = Math.max(
            last,
            TAB_SIZE * depthFor(node) + nodeExtractor(node).length
        );
    }
    const visitor = {
        onSummary: compareWidth,
        onDetail: compareWidth
    };
    node.visit(context.getVisitor(visitor));
    return last;
}

function makeLine(nameWidth, missingWidth) {
    const name = padding(nameWidth, '-');
    const pct = padding(PCT_COLS, '-');
    const elements = [];

    elements.push(name);
    elements.push(pct);
    elements.push(padding(PCT_COLS + 1, '-'));
    elements.push(pct);
    elements.push(pct);
    elements.push(padding(missingWidth, '-'));
    return elements.join(DELIM.replace(/ /g, '-')) + '-';
}

function tableHeader(maxNameCols, missingWidth) {
    const elements = [];
    elements.push(formatName('File', maxNameCols, 0));
    elements.push(formatPct('% Stmts'));
    elements.push(formatPct('% Branch', PCT_COLS + 1));
    elements.push(formatPct('% Funcs'));
    elements.push(formatPct('% Lines'));
    elements.push(formatName('Uncovered Line #s', missingWidth));
    return elements.join(DELIM) + ' ';
}

function isFull(metrics) {
    return (
        metrics.statements.pct === 100 &&
        metrics.branches.pct === 100 &&
        metrics.functions.pct === 100 &&
        metrics.lines.pct === 100
    );
}

function tableRow(
    node,
    context,
    colorizer,
    maxNameCols,
    level,
    skipEmpty,
    skipFull,
    missingWidth
) {
    const name = nodeName(node);
    const metrics = node.getCoverageSummary();
    const isEmpty = metrics.isEmpty();
    if (skipEmpty && isEmpty) {
        return '';
    }
    if (skipFull && isFull(metrics)) {
        return '';
    }

    const mm = {
        statements: isEmpty ? 0 : metrics.statements.pct,
        branches: isEmpty ? 0 : metrics.branches.pct,
        functions: isEmpty ? 0 : metrics.functions.pct,
        lines: isEmpty ? 0 : metrics.lines.pct
    };
    const colorize = isEmpty
        ? function(str) {
              return str;
          }
        : function(str, key) {
              return colorizer(str, context.classForPercent(key, mm[key]));
          };
    const elements = [];

    elements.push(colorize(formatName(name, maxNameCols, level), 'statements'));
    elements.push(colorize(formatPct(mm.statements), 'statements'));
    elements.push(colorize(formatPct(mm.branches, PCT_COLS + 1), 'branches'));
    elements.push(colorize(formatPct(mm.functions), 'functions'));
    elements.push(colorize(formatPct(mm.lines), 'lines'));
    elements.push(
        colorizer(
            formatName(nodeMissing(node), missingWidth),
            mm.lines === 100 ? 'medium' : 'low'
        )
    );

    return elements.join(DELIM) + ' ';
}

class TextReport extends ReportBase {
    constructor(opts) {
        super(opts);

        opts = opts || {};
        const { maxCols } = opts;

        this.file = opts.file || null;
        this.maxCols = maxCols != null ? maxCols : process.stdout.columns || 80;
        this.cw = null;
        this.skipEmpty = opts.skipEmpty;
        this.skipFull = opts.skipFull;
    }

    onStart(root, context) {
        this.cw = context.writer.writeFile(this.file);
        this.nameWidth = Math.max(
            NAME_COL,
            findWidth(root, context, nodeName, depthFor)
        );
        this.missingWidth = Math.max(
            MISSING_COL,
            findWidth(root, context, nodeMissing)
        );

        if (this.maxCols > 0) {
            const pct_cols = DELIM.length + 4 * (PCT_COLS + DELIM.length) + 2;

            const maxRemaining = this.maxCols - (pct_cols + MISSING_COL);
            if (this.nameWidth > maxRemaining) {
                this.nameWidth = maxRemaining;
                this.missingWidth = MISSING_COL;
            } else if (this.nameWidth < maxRemaining) {
                const maxRemaining = this.maxCols - (this.nameWidth + pct_cols);
                if (this.missingWidth > maxRemaining) {
                    this.missingWidth = maxRemaining;
                }
            }
        }
        const line = makeLine(this.nameWidth, this.missingWidth);
        this.cw.println(line);
        this.cw.println(tableHeader(this.nameWidth, this.missingWidth));
        this.cw.println(line);
    }

    onSummary(node, context) {
        const nodeDepth = depthFor(node);
        const row = tableRow(
            node,
            context,
            this.cw.colorize.bind(this.cw),
            this.nameWidth,
            nodeDepth,
            this.skipEmpty,
            this.skipFull,
            this.missingWidth
        );
        if (row) {
            this.cw.println(row);
        }
    }

    onDetail(node, context) {
        return this.onSummary(node, context);
    }

    onEnd() {
        this.cw.println(makeLine(this.nameWidth, this.missingWidth));
        this.cw.close();
    }
}

module.exports = TextReport;
