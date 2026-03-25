"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BreakStatement = BreakStatement;
exports.CatchClause = CatchClause;
exports.ContinueStatement = ContinueStatement;
exports.DebuggerStatement = DebuggerStatement;
exports.DoWhileStatement = DoWhileStatement;
exports.ForOfStatement = exports.ForInStatement = void 0;
exports.ForStatement = ForStatement;
exports.IfStatement = IfStatement;
exports.LabeledStatement = LabeledStatement;
exports.ReturnStatement = ReturnStatement;
exports.SwitchCase = SwitchCase;
exports.SwitchStatement = SwitchStatement;
exports.ThrowStatement = ThrowStatement;
exports.TryStatement = TryStatement;
exports.VariableDeclaration = VariableDeclaration;
exports.VariableDeclarator = VariableDeclarator;
exports.WhileStatement = WhileStatement;
exports.WithStatement = WithStatement;
var _t = require("@babel/types");
const {
  isFor,
  isForStatement,
  isIfStatement,
  isStatement
} = _t;
function WithStatement(node) {
  this.word("with");
  this.space();
  this.tokenChar(40);
  this.print(node.object);
  this.tokenChar(41);
  this.printBlock(node);
}
function IfStatement(node) {
  this.word("if");
  this.space();
  this.tokenChar(40);
  this.print(node.test);
  this.tokenChar(41);
  this.space();
  const needsBlock = node.alternate && isIfStatement(getLastStatement(node.consequent));
  if (needsBlock) {
    this.tokenChar(123);
    this.newline();
    this.indent();
  }
  this.printAndIndentOnComments(node.consequent);
  if (needsBlock) {
    this.dedent();
    this.newline();
    this.tokenChar(125);
  }
  if (node.alternate) {
    if (this.endsWith(125)) this.space();
    this.word("else");
    this.space();
    this.printAndIndentOnComments(node.alternate);
  }
}
function getLastStatement(statement) {
  const {
    body
  } = statement;
  if (isStatement(body) === false) {
    return statement;
  }
  return getLastStatement(body);
}
function ForStatement(node) {
  this.word("for");
  this.space();
  this.tokenChar(40);
  {
    const exit = this.enterForStatementInit();
    this.print(node.init);
    exit();
  }
  this.tokenChar(59);
  if (node.test) {
    this.space();
    this.print(node.test);
  }
  this.token(";", false, 1);
  if (node.update) {
    this.space();
    this.print(node.update);
  }
  this.tokenChar(41);
  this.printBlock(node);
}
function WhileStatement(node) {
  this.word("while");
  this.space();
  this.tokenChar(40);
  this.print(node.test);
  this.tokenChar(41);
  this.printBlock(node);
}
function ForXStatement(node) {
  this.word("for");
  this.space();
  const isForOf = node.type === "ForOfStatement";
  if (isForOf && node.await) {
    this.word("await");
    this.space();
  }
  this.noIndentInnerCommentsHere();
  this.tokenChar(40);
  {
    const exit = this.enterForXStatementInit(isForOf);
    this.print(node.left);
    exit == null || exit();
  }
  this.space();
  this.word(isForOf ? "of" : "in");
  this.space();
  this.print(node.right);
  this.tokenChar(41);
  this.printBlock(node);
}
const ForInStatement = exports.ForInStatement = ForXStatement;
const ForOfStatement = exports.ForOfStatement = ForXStatement;
function DoWhileStatement(node) {
  this.word("do");
  this.space();
  this.print(node.body);
  this.space();
  this.word("while");
  this.space();
  this.tokenChar(40);
  this.print(node.test);
  this.tokenChar(41);
  this.semicolon();
}
function printStatementAfterKeyword(printer, node) {
  if (node) {
    printer.space();
    printer.printTerminatorless(node);
  }
  printer.semicolon();
}
function BreakStatement(node) {
  this.word("break");
  printStatementAfterKeyword(this, node.label);
}
function ContinueStatement(node) {
  this.word("continue");
  printStatementAfterKeyword(this, node.label);
}
function ReturnStatement(node) {
  this.word("return");
  printStatementAfterKeyword(this, node.argument);
}
function ThrowStatement(node) {
  this.word("throw");
  printStatementAfterKeyword(this, node.argument);
}
function LabeledStatement(node) {
  this.print(node.label);
  this.tokenChar(58);
  this.space();
  this.print(node.body);
}
function TryStatement(node) {
  this.word("try");
  this.space();
  this.print(node.block);
  this.space();
  if (node.handlers) {
    this.print(node.handlers[0]);
  } else {
    this.print(node.handler);
  }
  if (node.finalizer) {
    this.space();
    this.word("finally");
    this.space();
    this.print(node.finalizer);
  }
}
function CatchClause(node) {
  this.word("catch");
  this.space();
  if (node.param) {
    this.tokenChar(40);
    this.print(node.param);
    this.print(node.param.typeAnnotation);
    this.tokenChar(41);
    this.space();
  }
  this.print(node.body);
}
function SwitchStatement(node) {
  this.word("switch");
  this.space();
  this.tokenChar(40);
  this.print(node.discriminant);
  this.tokenChar(41);
  this.space();
  this.tokenChar(123);
  this.printSequence(node.cases, true, undefined, function addNewlines(leading, cas) {
    if (!leading && node.cases[node.cases.length - 1] === cas) return -1;
  });
  this.rightBrace(node);
}
function SwitchCase(node) {
  if (node.test) {
    this.word("case");
    this.space();
    this.print(node.test);
    this.tokenChar(58);
  } else {
    this.word("default");
    this.tokenChar(58);
  }
  if (node.consequent.length) {
    this.newline();
    this.printSequence(node.consequent, true);
  }
}
function DebuggerStatement() {
  this.word("debugger");
  this.semicolon();
}
function VariableDeclaration(node, parent) {
  if (node.declare) {
    this.word("declare");
    this.space();
  }
  const {
    kind
  } = node;
  if (kind === "await using") {
    this.word("await");
    this.space();
    this.word("using", true);
  } else {
    this.word(kind, kind === "using");
  }
  this.space();
  let hasInits = false;
  if (!isFor(parent)) {
    for (const declar of node.declarations) {
      if (declar.init) {
        hasInits = true;
      }
    }
  }
  this.printList(node.declarations, undefined, undefined, node.declarations.length > 1, hasInits ? function (occurrenceCount) {
    this.token(",", false, occurrenceCount);
    this.newline();
  } : undefined);
  if (isFor(parent)) {
    if (isForStatement(parent)) {
      if (parent.init === node) return;
    } else {
      if (parent.left === node) return;
    }
  }
  this.semicolon();
}
function VariableDeclarator(node) {
  this.print(node.id);
  if (node.definite) this.tokenChar(33);
  this.print(node.id.typeAnnotation);
  if (node.init) {
    this.space();
    this.tokenChar(61);
    this.space();
    this.print(node.init);
  }
}

//# sourceMappingURL=statements.js.map
