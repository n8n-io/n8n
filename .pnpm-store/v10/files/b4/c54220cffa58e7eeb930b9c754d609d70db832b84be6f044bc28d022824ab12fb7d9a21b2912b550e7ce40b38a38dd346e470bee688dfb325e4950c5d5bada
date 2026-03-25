import { writeFile, rm } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { TraceMap, generatedPositionFor, eachMapping } from '@vitest/utils/source-map';
import { relative, basename, dirname, resolve, join, extname } from 'pathe';
import { x as x$1 } from 'tinyexec';
import { getTests, generateHash, calculateSuiteHash, someTasksAreOnly, interpretTaskModes } from '@vitest/runner/utils';
import '@vitest/utils';
import { parseAstAsync } from 'vite';
import nodeos__default from 'node:os';
import url from 'node:url';
import p$1 from 'node:path';
import fs from 'node:fs';
import ve from 'node:module';
import Ae from 'fs';

function hasFailedSnapshot(suite) {
	return getTests(suite).some((s) => {
		return s.result?.errors?.some((e) => typeof e?.message === "string" && e.message.match(/Snapshot .* mismatched/));
	});
}
function convertTasksToEvents(file, onTask) {
	const packs = [];
	const events = [];
	function visit(suite) {
		onTask?.(suite);
		packs.push([
			suite.id,
			suite.result,
			suite.meta
		]);
		events.push([suite.id, "suite-prepare"]);
		suite.tasks.forEach((task) => {
			if (task.type === "suite") {
				visit(task);
			} else {
				onTask?.(task);
				if (suite.mode !== "skip" && suite.mode !== "todo") {
					packs.push([
						task.id,
						task.result,
						task.meta
					]);
					events.push([task.id, "test-prepare"], [task.id, "test-finished"]);
				}
			}
		});
		events.push([suite.id, "suite-finished"]);
	}
	visit(file);
	return {
		packs,
		events
	};
}

const REGEXP_WRAP_PREFIX = "$$vitest:";
function getOutputFile(config, reporter) {
	if (!config?.outputFile) {
		return;
	}
	if (typeof config.outputFile === "string") {
		return config.outputFile;
	}
	return config.outputFile[reporter];
}
/**
* Prepares `SerializedConfig` for serialization, e.g. `node:v8.serialize`
*/
function wrapSerializableConfig(config) {
	let testNamePattern = config.testNamePattern;
	let defines = config.defines;
	if (testNamePattern && typeof testNamePattern !== "string") {
		testNamePattern = `${REGEXP_WRAP_PREFIX}${testNamePattern.toString()}`;
	}
	if (defines) {
		defines = {
			keys: Object.keys(defines),
			original: defines
		};
	}
	return {
		...config,
		testNamePattern,
		defines
	};
}

// AST walker module for ESTree compatible trees


// An ancestor walk keeps an array of ancestor nodes (including the
// current node) and passes them to the callback as third parameter
// (and also as state parameter when no other state is present).
function ancestor(node, visitors, baseVisitor, state, override) {
  var ancestors = [];
  if (!baseVisitor) { baseVisitor = base
  ; }(function c(node, st, override) {
    var type = override || node.type;
    var isNew = node !== ancestors[ancestors.length - 1];
    if (isNew) { ancestors.push(node); }
    baseVisitor[type](node, st, c);
    if (visitors[type]) { visitors[type](node, st || ancestors, ancestors); }
    if (isNew) { ancestors.pop(); }
  })(node, state, override);
}

function skipThrough(node, st, c) { c(node, st); }
function ignore(_node, _st, _c) {}

// Node walkers.

var base = {};

base.Program = base.BlockStatement = base.StaticBlock = function (node, st, c) {
  for (var i = 0, list = node.body; i < list.length; i += 1)
    {
    var stmt = list[i];

    c(stmt, st, "Statement");
  }
};
base.Statement = skipThrough;
base.EmptyStatement = ignore;
base.ExpressionStatement = base.ParenthesizedExpression = base.ChainExpression =
  function (node, st, c) { return c(node.expression, st, "Expression"); };
base.IfStatement = function (node, st, c) {
  c(node.test, st, "Expression");
  c(node.consequent, st, "Statement");
  if (node.alternate) { c(node.alternate, st, "Statement"); }
};
base.LabeledStatement = function (node, st, c) { return c(node.body, st, "Statement"); };
base.BreakStatement = base.ContinueStatement = ignore;
base.WithStatement = function (node, st, c) {
  c(node.object, st, "Expression");
  c(node.body, st, "Statement");
};
base.SwitchStatement = function (node, st, c) {
  c(node.discriminant, st, "Expression");
  for (var i = 0, list = node.cases; i < list.length; i += 1) {
    var cs = list[i];

    c(cs, st);
  }
};
base.SwitchCase = function (node, st, c) {
  if (node.test) { c(node.test, st, "Expression"); }
  for (var i = 0, list = node.consequent; i < list.length; i += 1)
    {
    var cons = list[i];

    c(cons, st, "Statement");
  }
};
base.ReturnStatement = base.YieldExpression = base.AwaitExpression = function (node, st, c) {
  if (node.argument) { c(node.argument, st, "Expression"); }
};
base.ThrowStatement = base.SpreadElement =
  function (node, st, c) { return c(node.argument, st, "Expression"); };
base.TryStatement = function (node, st, c) {
  c(node.block, st, "Statement");
  if (node.handler) { c(node.handler, st); }
  if (node.finalizer) { c(node.finalizer, st, "Statement"); }
};
base.CatchClause = function (node, st, c) {
  if (node.param) { c(node.param, st, "Pattern"); }
  c(node.body, st, "Statement");
};
base.WhileStatement = base.DoWhileStatement = function (node, st, c) {
  c(node.test, st, "Expression");
  c(node.body, st, "Statement");
};
base.ForStatement = function (node, st, c) {
  if (node.init) { c(node.init, st, "ForInit"); }
  if (node.test) { c(node.test, st, "Expression"); }
  if (node.update) { c(node.update, st, "Expression"); }
  c(node.body, st, "Statement");
};
base.ForInStatement = base.ForOfStatement = function (node, st, c) {
  c(node.left, st, "ForInit");
  c(node.right, st, "Expression");
  c(node.body, st, "Statement");
};
base.ForInit = function (node, st, c) {
  if (node.type === "VariableDeclaration") { c(node, st); }
  else { c(node, st, "Expression"); }
};
base.DebuggerStatement = ignore;

base.FunctionDeclaration = function (node, st, c) { return c(node, st, "Function"); };
base.VariableDeclaration = function (node, st, c) {
  for (var i = 0, list = node.declarations; i < list.length; i += 1)
    {
    var decl = list[i];

    c(decl, st);
  }
};
base.VariableDeclarator = function (node, st, c) {
  c(node.id, st, "Pattern");
  if (node.init) { c(node.init, st, "Expression"); }
};

base.Function = function (node, st, c) {
  if (node.id) { c(node.id, st, "Pattern"); }
  for (var i = 0, list = node.params; i < list.length; i += 1)
    {
    var param = list[i];

    c(param, st, "Pattern");
  }
  c(node.body, st, node.expression ? "Expression" : "Statement");
};

base.Pattern = function (node, st, c) {
  if (node.type === "Identifier")
    { c(node, st, "VariablePattern"); }
  else if (node.type === "MemberExpression")
    { c(node, st, "MemberPattern"); }
  else
    { c(node, st); }
};
base.VariablePattern = ignore;
base.MemberPattern = skipThrough;
base.RestElement = function (node, st, c) { return c(node.argument, st, "Pattern"); };
base.ArrayPattern = function (node, st, c) {
  for (var i = 0, list = node.elements; i < list.length; i += 1) {
    var elt = list[i];

    if (elt) { c(elt, st, "Pattern"); }
  }
};
base.ObjectPattern = function (node, st, c) {
  for (var i = 0, list = node.properties; i < list.length; i += 1) {
    var prop = list[i];

    if (prop.type === "Property") {
      if (prop.computed) { c(prop.key, st, "Expression"); }
      c(prop.value, st, "Pattern");
    } else if (prop.type === "RestElement") {
      c(prop.argument, st, "Pattern");
    }
  }
};

base.Expression = skipThrough;
base.ThisExpression = base.Super = base.MetaProperty = ignore;
base.ArrayExpression = function (node, st, c) {
  for (var i = 0, list = node.elements; i < list.length; i += 1) {
    var elt = list[i];

    if (elt) { c(elt, st, "Expression"); }
  }
};
base.ObjectExpression = function (node, st, c) {
  for (var i = 0, list = node.properties; i < list.length; i += 1)
    {
    var prop = list[i];

    c(prop, st);
  }
};
base.FunctionExpression = base.ArrowFunctionExpression = base.FunctionDeclaration;
base.SequenceExpression = function (node, st, c) {
  for (var i = 0, list = node.expressions; i < list.length; i += 1)
    {
    var expr = list[i];

    c(expr, st, "Expression");
  }
};
base.TemplateLiteral = function (node, st, c) {
  for (var i = 0, list = node.quasis; i < list.length; i += 1)
    {
    var quasi = list[i];

    c(quasi, st);
  }

  for (var i$1 = 0, list$1 = node.expressions; i$1 < list$1.length; i$1 += 1)
    {
    var expr = list$1[i$1];

    c(expr, st, "Expression");
  }
};
base.TemplateElement = ignore;
base.UnaryExpression = base.UpdateExpression = function (node, st, c) {
  c(node.argument, st, "Expression");
};
base.BinaryExpression = base.LogicalExpression = function (node, st, c) {
  c(node.left, st, "Expression");
  c(node.right, st, "Expression");
};
base.AssignmentExpression = base.AssignmentPattern = function (node, st, c) {
  c(node.left, st, "Pattern");
  c(node.right, st, "Expression");
};
base.ConditionalExpression = function (node, st, c) {
  c(node.test, st, "Expression");
  c(node.consequent, st, "Expression");
  c(node.alternate, st, "Expression");
};
base.NewExpression = base.CallExpression = function (node, st, c) {
  c(node.callee, st, "Expression");
  if (node.arguments)
    { for (var i = 0, list = node.arguments; i < list.length; i += 1)
      {
        var arg = list[i];

        c(arg, st, "Expression");
      } }
};
base.MemberExpression = function (node, st, c) {
  c(node.object, st, "Expression");
  if (node.computed) { c(node.property, st, "Expression"); }
};
base.ExportNamedDeclaration = base.ExportDefaultDeclaration = function (node, st, c) {
  if (node.declaration)
    { c(node.declaration, st, node.type === "ExportNamedDeclaration" || node.declaration.id ? "Statement" : "Expression"); }
  if (node.source) { c(node.source, st, "Expression"); }
};
base.ExportAllDeclaration = function (node, st, c) {
  if (node.exported)
    { c(node.exported, st); }
  c(node.source, st, "Expression");
};
base.ImportDeclaration = function (node, st, c) {
  for (var i = 0, list = node.specifiers; i < list.length; i += 1)
    {
    var spec = list[i];

    c(spec, st);
  }
  c(node.source, st, "Expression");
};
base.ImportExpression = function (node, st, c) {
  c(node.source, st, "Expression");
};
base.ImportSpecifier = base.ImportDefaultSpecifier = base.ImportNamespaceSpecifier = base.Identifier = base.PrivateIdentifier = base.Literal = ignore;

base.TaggedTemplateExpression = function (node, st, c) {
  c(node.tag, st, "Expression");
  c(node.quasi, st, "Expression");
};
base.ClassDeclaration = base.ClassExpression = function (node, st, c) { return c(node, st, "Class"); };
base.Class = function (node, st, c) {
  if (node.id) { c(node.id, st, "Pattern"); }
  if (node.superClass) { c(node.superClass, st, "Expression"); }
  c(node.body, st);
};
base.ClassBody = function (node, st, c) {
  for (var i = 0, list = node.body; i < list.length; i += 1)
    {
    var elt = list[i];

    c(elt, st);
  }
};
base.MethodDefinition = base.PropertyDefinition = base.Property = function (node, st, c) {
  if (node.computed) { c(node.key, st, "Expression"); }
  if (node.value) { c(node.value, st, "Expression"); }
};

async function collectTests(ctx, filepath) {
	const request = await ctx.vitenode.transformRequest(filepath, filepath);
	if (!request) {
		return null;
	}
	const ast = await parseAstAsync(request.code);
	const testFilepath = relative(ctx.config.root, filepath);
	const projectName = ctx.name;
	const typecheckSubprojectName = projectName ? `${projectName}:__typecheck__` : "__typecheck__";
	const file = {
		filepath,
		type: "suite",
		id: generateHash(`${testFilepath}${typecheckSubprojectName}`),
		name: testFilepath,
		mode: "run",
		tasks: [],
		start: ast.start,
		end: ast.end,
		projectName,
		meta: { typecheck: true },
		file: null
	};
	file.file = file;
	const definitions = [];
	const getName = (callee) => {
		if (!callee) {
			return null;
		}
		if (callee.type === "Identifier") {
			return callee.name;
		}
		if (callee.type === "CallExpression") {
			return getName(callee.callee);
		}
		if (callee.type === "TaggedTemplateExpression") {
			return getName(callee.tag);
		}
		if (callee.type === "MemberExpression") {
			if (callee.object?.type === "Identifier" && [
				"it",
				"test",
				"describe",
				"suite"
			].includes(callee.object.name)) {
				return callee.object?.name;
			}
			if (callee.object?.name?.startsWith("__vite_ssr_")) {
				return getName(callee.property);
			}
			return getName(callee.object?.property);
		}
		if (callee.type === "SequenceExpression" && callee.expressions.length === 2) {
			const [e0, e1] = callee.expressions;
			if (e0.type === "Literal" && e0.value === 0) {
				return getName(e1);
			}
		}
		return null;
	};
	ancestor(ast, { CallExpression(node) {
		const { callee } = node;
		const name = getName(callee);
		if (!name) {
			return;
		}
		if (![
			"it",
			"test",
			"describe",
			"suite"
		].includes(name)) {
			return;
		}
		const property = callee?.property?.name;
		let mode = !property || property === name ? "run" : property;
		if ([
			"each",
			"for",
			"skipIf",
			"runIf"
		].includes(mode)) {
			return;
		}
		let start;
		const end = node.end;
		if (callee.type === "CallExpression") {
			start = callee.end;
		} else if (callee.type === "TaggedTemplateExpression") {
			start = callee.end + 1;
		} else {
			start = node.start;
		}
		const { arguments: [messageNode] } = node;
		const isQuoted = messageNode?.type === "Literal" || messageNode?.type === "TemplateLiteral";
		const message = isQuoted ? request.code.slice(messageNode.start + 1, messageNode.end - 1) : request.code.slice(messageNode.start, messageNode.end);
		if (mode === "skipIf" || mode === "runIf") {
			mode = "skip";
		}
		definitions.push({
			start,
			end,
			name: message,
			type: name === "it" || name === "test" ? "test" : "suite",
			mode,
			task: null
		});
	} });
	let lastSuite = file;
	const updateLatestSuite = (index) => {
		while (lastSuite.suite && lastSuite.end < index) {
			lastSuite = lastSuite.suite;
		}
		return lastSuite;
	};
	definitions.sort((a, b) => a.start - b.start).forEach((definition) => {
		const latestSuite = updateLatestSuite(definition.start);
		let mode = definition.mode;
		if (latestSuite.mode !== "run") {
			mode = latestSuite.mode;
		}
		if (definition.type === "suite") {
			const task = {
				type: definition.type,
				id: "",
				suite: latestSuite,
				file,
				tasks: [],
				mode,
				name: definition.name,
				end: definition.end,
				start: definition.start,
				meta: { typecheck: true }
			};
			definition.task = task;
			latestSuite.tasks.push(task);
			lastSuite = task;
			return;
		}
		const task = {
			type: definition.type,
			id: "",
			suite: latestSuite,
			file,
			mode,
			timeout: 0,
			context: {},
			name: definition.name,
			end: definition.end,
			start: definition.start,
			meta: { typecheck: true }
		};
		definition.task = task;
		latestSuite.tasks.push(task);
	});
	calculateSuiteHash(file);
	const hasOnly = someTasksAreOnly(file);
	interpretTaskModes(file, ctx.config.testNamePattern, undefined, hasOnly, false, ctx.config.allowOnly);
	return {
		file,
		parsed: request.code,
		filepath,
		map: request.map,
		definitions
	};
}

const A=r=>r!==null&&typeof r=="object",a=(r,t)=>Object.assign(new Error(`[${r}]: ${t}`),{code:r}),_="ERR_INVALID_PACKAGE_CONFIG",E$1="ERR_INVALID_PACKAGE_TARGET",I="ERR_PACKAGE_PATH_NOT_EXPORTED",R=/^\d+$/,O$1=/^(\.{1,2}|node_modules)$/i,w=/\/|\\/;var h$1=(r=>(r.Export="exports",r.Import="imports",r))(h$1||{});const f=(r,t,e,o,c)=>{if(t==null)return [];if(typeof t=="string"){const[n,...i]=t.split(w);if(n===".."||i.some(l=>O$1.test(l)))throw a(E$1,`Invalid "${r}" target "${t}" defined in the package config`);return [c?t.replace(/\*/g,c):t]}if(Array.isArray(t))return t.flatMap(n=>f(r,n,e,o,c));if(A(t)){for(const n of Object.keys(t)){if(R.test(n))throw a(_,"Cannot contain numeric property keys");if(n==="default"||o.includes(n))return f(r,t[n],e,o,c)}return []}throw a(E$1,`Invalid "${r}" target "${t}"`)},s="*",m=(r,t)=>{const e=r.indexOf(s),o=t.indexOf(s);return e===o?t.length>r.length:o>e};function d(r,t){if(!t.includes(s)&&r.hasOwnProperty(t))return [t];let e,o;for(const c of Object.keys(r))if(c.includes(s)){const[n,i,l]=c.split(s);if(l===void 0&&t.startsWith(n)&&t.endsWith(i)){const g=t.slice(n.length,-i.length||void 0);g&&(!e||m(e,c))&&(e=c,o=g);}}return [e,o]}const p=r=>Object.keys(r).reduce((t,e)=>{const o=e===""||e[0]!==".";if(t===void 0||t===o)return o;throw a(_,'"exports" cannot contain some keys starting with "." and some not')},void 0),u=/^\w+:/,v=(r,t,e)=>{if(!r)throw new Error('"exports" is required');t=t===""?".":`./${t}`,(typeof r=="string"||Array.isArray(r)||A(r)&&p(r))&&(r={".":r});const[o,c]=d(r,t),n=f(h$1.Export,r[o],t,e,c);if(n.length===0)throw a(I,t==="."?'No "exports" main defined':`Package subpath '${t}' is not defined by "exports"`);for(const i of n)if(!i.startsWith("./")&&!u.test(i))throw a(E$1,`Invalid "exports" target "${i}" defined in the package config`);return n};

var de=Object.defineProperty;var o=(e,t)=>de(e,"name",{value:t,configurable:true});function E(e){return e.startsWith("\\\\?\\")?e:e.replace(/\\/g,"/")}o(E,"slash");const O=o(e=>{const t=fs[e];return (s,...n)=>{const l=`${e}:${n.join(":")}`;let i=s==null?void 0:s.get(l);return i===void 0&&(i=Reflect.apply(t,fs,n),s==null||s.set(l,i)),i}},"cacheFs"),B=O("existsSync"),_e=O("readFileSync"),W=O("statSync"),le=o((e,t,s)=>{for(;;){const n=p$1.posix.join(e,t);if(B(s,n))return n;const l=p$1.dirname(e);if(l===e)return;e=l;}},"findUp"),G=/^\.{1,2}(\/.*)?$/,Q=o(e=>{const t=E(e);return G.test(t)?t:`./${t}`},"normalizeRelativePath");function je(e,t=false){const s=e.length;let n=0,l="",i=0,u=16,f=0,r=0,g=0,T=0,b=0;function _(c,k){let m=0,F=0;for(;m<c;){let j=e.charCodeAt(n);if(j>=48&&j<=57)F=F*16+j-48;else if(j>=65&&j<=70)F=F*16+j-65+10;else if(j>=97&&j<=102)F=F*16+j-97+10;else break;n++,m++;}return m<c&&(F=-1),F}o(_,"scanHexDigits");function d(c){n=c,l="",i=0,u=16,b=0;}o(d,"setPosition");function A(){let c=n;if(e.charCodeAt(n)===48)n++;else for(n++;n<e.length&&h(e.charCodeAt(n));)n++;if(n<e.length&&e.charCodeAt(n)===46)if(n++,n<e.length&&h(e.charCodeAt(n)))for(n++;n<e.length&&h(e.charCodeAt(n));)n++;else return b=3,e.substring(c,n);let k=n;if(n<e.length&&(e.charCodeAt(n)===69||e.charCodeAt(n)===101))if(n++,(n<e.length&&e.charCodeAt(n)===43||e.charCodeAt(n)===45)&&n++,n<e.length&&h(e.charCodeAt(n))){for(n++;n<e.length&&h(e.charCodeAt(n));)n++;k=n;}else b=3;return e.substring(c,k)}o(A,"scanNumber");function w(){let c="",k=n;for(;;){if(n>=s){c+=e.substring(k,n),b=2;break}const m=e.charCodeAt(n);if(m===34){c+=e.substring(k,n),n++;break}if(m===92){if(c+=e.substring(k,n),n++,n>=s){b=2;break}switch(e.charCodeAt(n++)){case 34:c+='"';break;case 92:c+="\\";break;case 47:c+="/";break;case 98:c+="\b";break;case 102:c+="\f";break;case 110:c+=`
`;break;case 114:c+="\r";break;case 116:c+="	";break;case 117:const j=_(4);j>=0?c+=String.fromCharCode(j):b=4;break;default:b=5;}k=n;continue}if(m>=0&&m<=31)if(N(m)){c+=e.substring(k,n),b=2;break}else b=6;n++;}return c}o(w,"scanString");function y(){if(l="",b=0,i=n,r=f,T=g,n>=s)return i=s,u=17;let c=e.charCodeAt(n);if(H(c)){do n++,l+=String.fromCharCode(c),c=e.charCodeAt(n);while(H(c));return u=15}if(N(c))return n++,l+=String.fromCharCode(c),c===13&&e.charCodeAt(n)===10&&(n++,l+=`
`),f++,g=n,u=14;switch(c){case 123:return n++,u=1;case 125:return n++,u=2;case 91:return n++,u=3;case 93:return n++,u=4;case 58:return n++,u=6;case 44:return n++,u=5;case 34:return n++,l=w(),u=10;case 47:const k=n-1;if(e.charCodeAt(n+1)===47){for(n+=2;n<s&&!N(e.charCodeAt(n));)n++;return l=e.substring(k,n),u=12}if(e.charCodeAt(n+1)===42){n+=2;const m=s-1;let F=false;for(;n<m;){const j=e.charCodeAt(n);if(j===42&&e.charCodeAt(n+1)===47){n+=2,F=true;break}n++,N(j)&&(j===13&&e.charCodeAt(n)===10&&n++,f++,g=n);}return F||(n++,b=1),l=e.substring(k,n),u=13}return l+=String.fromCharCode(c),n++,u=16;case 45:if(l+=String.fromCharCode(c),n++,n===s||!h(e.charCodeAt(n)))return u=16;case 48:case 49:case 50:case 51:case 52:case 53:case 54:case 55:case 56:case 57:return l+=A(),u=11;default:for(;n<s&&I(c);)n++,c=e.charCodeAt(n);if(i!==n){switch(l=e.substring(i,n),l){case "true":return u=8;case "false":return u=9;case "null":return u=7}return u=16}return l+=String.fromCharCode(c),n++,u=16}}o(y,"scanNext");function I(c){if(H(c)||N(c))return  false;switch(c){case 125:case 93:case 123:case 91:case 34:case 58:case 44:case 47:return  false}return  true}o(I,"isUnknownContentCharacter");function L(){let c;do c=y();while(c>=12&&c<=15);return c}return o(L,"scanNextNonTrivia"),{setPosition:d,getPosition:o(()=>n,"getPosition"),scan:t?L:y,getToken:o(()=>u,"getToken"),getTokenValue:o(()=>l,"getTokenValue"),getTokenOffset:o(()=>i,"getTokenOffset"),getTokenLength:o(()=>n-i,"getTokenLength"),getTokenStartLine:o(()=>r,"getTokenStartLine"),getTokenStartCharacter:o(()=>i-T,"getTokenStartCharacter"),getTokenError:o(()=>b,"getTokenError")}}o(je,"createScanner");function H(e){return e===32||e===9}o(H,"isWhiteSpace");function N(e){return e===10||e===13}o(N,"isLineBreak");function h(e){return e>=48&&e<=57}o(h,"isDigit");var ie;((function(e){e[e.lineFeed=10]="lineFeed",e[e.carriageReturn=13]="carriageReturn",e[e.space=32]="space",e[e._0=48]="_0",e[e._1=49]="_1",e[e._2=50]="_2",e[e._3=51]="_3",e[e._4=52]="_4",e[e._5=53]="_5",e[e._6=54]="_6",e[e._7=55]="_7",e[e._8=56]="_8",e[e._9=57]="_9",e[e.a=97]="a",e[e.b=98]="b",e[e.c=99]="c",e[e.d=100]="d",e[e.e=101]="e",e[e.f=102]="f",e[e.g=103]="g",e[e.h=104]="h",e[e.i=105]="i",e[e.j=106]="j",e[e.k=107]="k",e[e.l=108]="l",e[e.m=109]="m",e[e.n=110]="n",e[e.o=111]="o",e[e.p=112]="p",e[e.q=113]="q",e[e.r=114]="r",e[e.s=115]="s",e[e.t=116]="t",e[e.u=117]="u",e[e.v=118]="v",e[e.w=119]="w",e[e.x=120]="x",e[e.y=121]="y",e[e.z=122]="z",e[e.A=65]="A",e[e.B=66]="B",e[e.C=67]="C",e[e.D=68]="D",e[e.E=69]="E",e[e.F=70]="F",e[e.G=71]="G",e[e.H=72]="H",e[e.I=73]="I",e[e.J=74]="J",e[e.K=75]="K",e[e.L=76]="L",e[e.M=77]="M",e[e.N=78]="N",e[e.O=79]="O",e[e.P=80]="P",e[e.Q=81]="Q",e[e.R=82]="R",e[e.S=83]="S",e[e.T=84]="T",e[e.U=85]="U",e[e.V=86]="V",e[e.W=87]="W",e[e.X=88]="X",e[e.Y=89]="Y",e[e.Z=90]="Z",e[e.asterisk=42]="asterisk",e[e.backslash=92]="backslash",e[e.closeBrace=125]="closeBrace",e[e.closeBracket=93]="closeBracket",e[e.colon=58]="colon",e[e.comma=44]="comma",e[e.dot=46]="dot",e[e.doubleQuote=34]="doubleQuote",e[e.minus=45]="minus",e[e.openBrace=123]="openBrace",e[e.openBracket=91]="openBracket",e[e.plus=43]="plus",e[e.slash=47]="slash",e[e.formFeed=12]="formFeed",e[e.tab=9]="tab";}))(ie||(ie={})),new Array(20).fill(0).map((e,t)=>" ".repeat(t));const x=200;new Array(x).fill(0).map((e,t)=>`
`+" ".repeat(t)),new Array(x).fill(0).map((e,t)=>"\r"+" ".repeat(t)),new Array(x).fill(0).map((e,t)=>`\r
`+" ".repeat(t)),new Array(x).fill(0).map((e,t)=>`
`+"	".repeat(t)),new Array(x).fill(0).map((e,t)=>"\r"+"	".repeat(t)),new Array(x).fill(0).map((e,t)=>`\r
`+"	".repeat(t));var M;(function(e){e.DEFAULT={allowTrailingComma:false};})(M||(M={}));function ye(e,t=[],s=M.DEFAULT){let n=null,l=[];const i=[];function u(r){Array.isArray(l)?l.push(r):n!==null&&(l[n]=r);}return o(u,"onValue"),Fe(e,{onObjectBegin:o(()=>{const r={};u(r),i.push(l),l=r,n=null;},"onObjectBegin"),onObjectProperty:o(r=>{n=r;},"onObjectProperty"),onObjectEnd:o(()=>{l=i.pop();},"onObjectEnd"),onArrayBegin:o(()=>{const r=[];u(r),i.push(l),l=r,n=null;},"onArrayBegin"),onArrayEnd:o(()=>{l=i.pop();},"onArrayEnd"),onLiteralValue:u,onError:o((r,g,T)=>{t.push({error:r,offset:g,length:T});},"onError")},s),l[0]}o(ye,"parse$1");function Fe(e,t,s=M.DEFAULT){const n=je(e,false),l=[];function i(v){return v?()=>v(n.getTokenOffset(),n.getTokenLength(),n.getTokenStartLine(),n.getTokenStartCharacter()):()=>true}o(i,"toNoArgVisit");function u(v){return v?()=>v(n.getTokenOffset(),n.getTokenLength(),n.getTokenStartLine(),n.getTokenStartCharacter(),()=>l.slice()):()=>true}o(u,"toNoArgVisitWithPath");function f(v){return v?D=>v(D,n.getTokenOffset(),n.getTokenLength(),n.getTokenStartLine(),n.getTokenStartCharacter()):()=>true}o(f,"toOneArgVisit");function r(v){return v?D=>v(D,n.getTokenOffset(),n.getTokenLength(),n.getTokenStartLine(),n.getTokenStartCharacter(),()=>l.slice()):()=>true}o(r,"toOneArgVisitWithPath");const g=u(t.onObjectBegin),T=r(t.onObjectProperty),b=i(t.onObjectEnd),_=u(t.onArrayBegin),d=i(t.onArrayEnd),A=r(t.onLiteralValue),w=f(t.onSeparator),y=i(t.onComment),I=f(t.onError),L=s&&s.disallowComments,c=s&&s.allowTrailingComma;function k(){for(;;){const v=n.scan();switch(n.getTokenError()){case 4:m(14);break;case 5:m(15);break;case 3:m(13);break;case 1:L||m(11);break;case 2:m(12);break;case 6:m(16);break}switch(v){case 12:case 13:L?m(10):y();break;case 16:m(1);break;case 15:case 14:break;default:return v}}}o(k,"scanNext");function m(v,D=[],te=[]){if(I(v),D.length+te.length>0){let P=n.getToken();for(;P!==17;){if(D.indexOf(P)!==-1){k();break}else if(te.indexOf(P)!==-1)break;P=k();}}}o(m,"handleError");function F(v){const D=n.getTokenValue();return v?A(D):(T(D),l.push(D)),k(),true}o(F,"parseString");function j(){switch(n.getToken()){case 11:const v=n.getTokenValue();let D=Number(v);isNaN(D)&&(m(2),D=0),A(D);break;case 7:A(null);break;case 8:A(true);break;case 9:A(false);break;default:return  false}return k(),true}o(j,"parseLiteral");function S(){return n.getToken()!==10?(m(3,[],[2,5]),false):(F(false),n.getToken()===6?(w(":"),k(),U()||m(4,[],[2,5])):m(5,[],[2,5]),l.pop(),true)}o(S,"parseProperty");function R(){g(),k();let v=false;for(;n.getToken()!==2&&n.getToken()!==17;){if(n.getToken()===5){if(v||m(4,[],[]),w(","),k(),n.getToken()===2&&c)break}else v&&m(6,[],[]);S()||m(4,[],[2,5]),v=true;}return b(),n.getToken()!==2?m(7,[2],[]):k(),true}o(R,"parseObject");function a(){_(),k();let v=true,D=false;for(;n.getToken()!==4&&n.getToken()!==17;){if(n.getToken()===5){if(D||m(4,[],[]),w(","),k(),n.getToken()===4&&c)break}else D&&m(6,[],[]);v?(l.push(0),v=false):l[l.length-1]++,U()||m(4,[],[4,5]),D=true;}return d(),v||l.pop(),n.getToken()!==4?m(8,[4],[]):k(),true}o(a,"parseArray");function U(){switch(n.getToken()){case 3:return a();case 1:return R();case 10:return F(true);default:return j()}}return o(U,"parseValue"),k(),n.getToken()===17?s.allowEmptyContent?true:(m(4,[],[]),false):U()?(n.getToken()!==17&&m(9,[],[]),true):(m(4,[],[]),false)}o(Fe,"visit");var oe;(function(e){e[e.None=0]="None",e[e.UnexpectedEndOfComment=1]="UnexpectedEndOfComment",e[e.UnexpectedEndOfString=2]="UnexpectedEndOfString",e[e.UnexpectedEndOfNumber=3]="UnexpectedEndOfNumber",e[e.InvalidUnicode=4]="InvalidUnicode",e[e.InvalidEscapeCharacter=5]="InvalidEscapeCharacter",e[e.InvalidCharacter=6]="InvalidCharacter";})(oe||(oe={}));var ue;(function(e){e[e.OpenBraceToken=1]="OpenBraceToken",e[e.CloseBraceToken=2]="CloseBraceToken",e[e.OpenBracketToken=3]="OpenBracketToken",e[e.CloseBracketToken=4]="CloseBracketToken",e[e.CommaToken=5]="CommaToken",e[e.ColonToken=6]="ColonToken",e[e.NullKeyword=7]="NullKeyword",e[e.TrueKeyword=8]="TrueKeyword",e[e.FalseKeyword=9]="FalseKeyword",e[e.StringLiteral=10]="StringLiteral",e[e.NumericLiteral=11]="NumericLiteral",e[e.LineCommentTrivia=12]="LineCommentTrivia",e[e.BlockCommentTrivia=13]="BlockCommentTrivia",e[e.LineBreakTrivia=14]="LineBreakTrivia",e[e.Trivia=15]="Trivia",e[e.Unknown=16]="Unknown",e[e.EOF=17]="EOF";})(ue||(ue={}));const De=ye;var re;(function(e){e[e.InvalidSymbol=1]="InvalidSymbol",e[e.InvalidNumberFormat=2]="InvalidNumberFormat",e[e.PropertyNameExpected=3]="PropertyNameExpected",e[e.ValueExpected=4]="ValueExpected",e[e.ColonExpected=5]="ColonExpected",e[e.CommaExpected=6]="CommaExpected",e[e.CloseBraceExpected=7]="CloseBraceExpected",e[e.CloseBracketExpected=8]="CloseBracketExpected",e[e.EndOfFileExpected=9]="EndOfFileExpected",e[e.InvalidCommentToken=10]="InvalidCommentToken",e[e.UnexpectedEndOfComment=11]="UnexpectedEndOfComment",e[e.UnexpectedEndOfString=12]="UnexpectedEndOfString",e[e.UnexpectedEndOfNumber=13]="UnexpectedEndOfNumber",e[e.InvalidUnicode=14]="InvalidUnicode",e[e.InvalidEscapeCharacter=15]="InvalidEscapeCharacter",e[e.InvalidCharacter=16]="InvalidCharacter";})(re||(re={}));const fe=o((e,t)=>De(_e(t,e,"utf8")),"readJsonc"),X=Symbol("implicitBaseUrl"),$="${configDir}",Ee=o(()=>{const{findPnpApi:e}=ve;return e&&e(process.cwd())},"getPnpApi"),Y=o((e,t,s,n)=>{const l=`resolveFromPackageJsonPath:${e}:${t}:${s}`;if(n!=null&&n.has(l))return n.get(l);const i=fe(e,n);if(!i)return;let u=t||"tsconfig.json";if(!s&&i.exports)try{const[f]=v(i.exports,t,["require","types"]);u=f;}catch{return  false}else !t&&i.tsconfig&&(u=i.tsconfig);return u=p$1.join(e,"..",u),n==null||n.set(l,u),u},"resolveFromPackageJsonPath"),Z="package.json",q="tsconfig.json",Be=o((e,t,s)=>{let n=e;if(e===".."&&(n=p$1.join(n,q)),e[0]==="."&&(n=p$1.resolve(t,n)),p$1.isAbsolute(n)){if(B(s,n)){if(W(s,n).isFile())return n}else if(!n.endsWith(".json")){const d=`${n}.json`;if(B(s,d))return d}return}const[l,...i]=e.split("/"),u=l[0]==="@"?`${l}/${i.shift()}`:l,f=i.join("/"),r=Ee();if(r){const{resolveRequest:d}=r;try{if(u===e){const A=d(p$1.join(u,Z),t);if(A){const w=Y(A,f,!1,s);if(w&&B(s,w))return w}}else {let A;try{A=d(e,t,{extensions:[".json"]});}catch{A=d(p$1.join(e,q),t);}if(A)return A}}catch{}}const g=le(p$1.resolve(t),p$1.join("node_modules",u),s);if(!g||!W(s,g).isDirectory())return;const T=p$1.join(g,Z);if(B(s,T)){const d=Y(T,f,false,s);if(d===false)return;if(d&&B(s,d)&&W(s,d).isFile())return d}const b=p$1.join(g,f),_=b.endsWith(".json");if(!_){const d=`${b}.json`;if(B(s,d))return d}if(B(s,b)){if(W(s,b).isDirectory()){const d=p$1.join(b,Z);if(B(s,d)){const w=Y(d,"",true,s);if(w&&B(s,w))return w}const A=p$1.join(b,q);if(B(s,A))return A}else if(_)return b}},"resolveExtendsPath"),K=o((e,t)=>Q(p$1.relative(e,t)),"pathRelative"),ce=["files","include","exclude"],Ie=o((e,t,s,n)=>{const l=Be(e,t,n);if(!l)throw new Error(`File '${e}' not found.`);if(s.has(l))throw new Error(`Circularity detected while resolving configuration: ${l}`);s.add(l);const i=p$1.dirname(l),u=ae(l,n,s);delete u.references;const{compilerOptions:f}=u;if(f){const{baseUrl:r}=f;r&&!r.startsWith($)&&(f.baseUrl=E(p$1.relative(t,p$1.join(i,r)))||"./");let{outDir:g}=f;g&&(g.startsWith($)||(g=p$1.relative(t,p$1.join(i,g))),f.outDir=E(g)||"./");}for(const r of ce){const g=u[r];g&&(u[r]=g.map(T=>T.startsWith($)?T:E(p$1.relative(t,p$1.join(i,T)))));}return u},"resolveExtends"),Le=["outDir","declarationDir"],ae=o((e,t,s=new Set)=>{let n;try{n=fe(e,t)||{};}catch{throw new Error(`Cannot resolve tsconfig at path: ${e}`)}if(typeof n!="object")throw new SyntaxError(`Failed to parse tsconfig at: ${e}`);const l=p$1.dirname(e);if(n.compilerOptions){const{compilerOptions:i}=n;i.paths&&!i.baseUrl&&(i[X]=l);}if(n.extends){const i=Array.isArray(n.extends)?n.extends:[n.extends];delete n.extends;for(const u of i.reverse()){const f=Ie(u,l,new Set(s),t),r={...f,...n,compilerOptions:{...f.compilerOptions,...n.compilerOptions}};f.watchOptions&&(r.watchOptions={...f.watchOptions,...n.watchOptions}),n=r;}}if(n.compilerOptions){const{compilerOptions:i}=n,u=["baseUrl","rootDir"];for(const f of u){const r=i[f];if(r&&!r.startsWith($)){const g=p$1.resolve(l,r),T=K(l,g);i[f]=T;}}for(const f of Le){let r=i[f];r&&(Array.isArray(n.exclude)||(n.exclude=[]),n.exclude.includes(r)||n.exclude.push(r),r.startsWith($)||(r=Q(r)),i[f]=r);}}else n.compilerOptions={};if(n.include?(n.include=n.include.map(E),n.files&&delete n.files):n.files&&(n.files=n.files.map(i=>i.startsWith($)?i:Q(i))),n.watchOptions){const{watchOptions:i}=n;i.excludeDirectories&&(i.excludeDirectories=i.excludeDirectories.map(u=>E(p$1.resolve(l,u))));}return n},"_parseTsconfig"),V=o((e,t)=>{if(e.startsWith($))return E(p$1.join(t,e.slice($.length)))},"interpolateConfigDir"),$e=["outDir","declarationDir","outFile","rootDir","baseUrl","tsBuildInfoFile"],Ue=o(e=>{if(e.strict){const a=["noImplicitAny","noImplicitThis","strictNullChecks","strictFunctionTypes","strictBindCallApply","strictPropertyInitialization","strictBuiltinIteratorReturn","alwaysStrict","useUnknownInCatchVariables"];for(const U of a)e[U]===void 0&&(e[U]=true);}if(e.target){let a=e.target.toLowerCase();a==="es2015"&&(a="es6"),e.target=a,a==="esnext"&&((e.module)!=null||(e.module="es6"),(e.moduleResolution)!=null||(e.moduleResolution="classic"),(e.useDefineForClassFields)!=null||(e.useDefineForClassFields=true)),(a==="es6"||a==="es2016"||a==="es2017"||a==="es2018"||a==="es2019"||a==="es2020"||a==="es2021"||a==="es2022"||a==="es2023"||a==="es2024")&&((e.module)!=null||(e.module="es6"),(e.moduleResolution)!=null||(e.moduleResolution="classic")),(a==="es2022"||a==="es2023"||a==="es2024")&&((e.useDefineForClassFields)!=null||(e.useDefineForClassFields=true));}if(e.module){let a=e.module.toLowerCase();a==="es2015"&&(a="es6"),e.module=a,(a==="es6"||a==="es2020"||a==="es2022"||a==="esnext"||a==="none"||a==="system"||a==="umd"||a==="amd")&&((e.moduleResolution)!=null||(e.moduleResolution="classic")),a==="system"&&((e.allowSyntheticDefaultImports)!=null||(e.allowSyntheticDefaultImports=true)),(a==="node16"||a==="nodenext"||a==="preserve")&&((e.esModuleInterop)!=null||(e.esModuleInterop=true),(e.allowSyntheticDefaultImports)!=null||(e.allowSyntheticDefaultImports=true)),(a==="node16"||a==="nodenext")&&((e.moduleDetection)!=null||(e.moduleDetection="force"),(e.useDefineForClassFields)!=null||(e.useDefineForClassFields=true)),a==="node16"&&((e.target)!=null||(e.target="es2022"),(e.moduleResolution)!=null||(e.moduleResolution="node16")),a==="nodenext"&&((e.target)!=null||(e.target="esnext"),(e.moduleResolution)!=null||(e.moduleResolution="nodenext")),a==="preserve"&&((e.moduleResolution)!=null||(e.moduleResolution="bundler"));}if(e.moduleResolution){let a=e.moduleResolution.toLowerCase();a==="node"&&(a="node10"),e.moduleResolution=a,(a==="node16"||a==="nodenext"||a==="bundler")&&((e.resolvePackageJsonExports)!=null||(e.resolvePackageJsonExports=true),(e.resolvePackageJsonImports)!=null||(e.resolvePackageJsonImports=true)),a==="bundler"&&((e.allowSyntheticDefaultImports)!=null||(e.allowSyntheticDefaultImports=true),(e.resolveJsonModule)!=null||(e.resolveJsonModule=true));}e.esModuleInterop&&((e.allowSyntheticDefaultImports)!=null||(e.allowSyntheticDefaultImports=true)),e.verbatimModuleSyntax&&((e.isolatedModules)!=null||(e.isolatedModules=true),(e.preserveConstEnums)!=null||(e.preserveConstEnums=true)),e.isolatedModules&&((e.preserveConstEnums)!=null||(e.preserveConstEnums=true));},"normalizeCompilerOptions"),ge=o((e,t=new Map)=>{const s=p$1.resolve(e),n=ae(s,t),l=p$1.dirname(s),{compilerOptions:i}=n;if(i){for(const f of $e){const r=i[f];if(r){const g=V(r,l);i[f]=g?K(l,g):r;}}for(const f of ["rootDirs","typeRoots"]){const r=i[f];r&&(i[f]=r.map(g=>{const T=V(g,l);return T?K(l,T):g}));}const{paths:u}=i;if(u)for(const f of Object.keys(u))u[f]=u[f].map(r=>{var g;return (g=V(r,l))!=null?g:r});Ue(i);}for(const u of ce){const f=n[u];f&&(n[u]=f.map(r=>{var g;return (g=V(r,l))!=null?g:r}));}return n},"parseTsconfig"),he=o((e=process.cwd(),t="tsconfig.json",s=new Map)=>{const n=le(E(e),t,s);if(!n)return null;const l=ge(n,s);return {path:n,config:l}},"getTsconfig"),xe=/\*/g,me=o((e,t)=>{const s=e.match(xe);if(s&&s.length>1)throw new Error(t)},"assertStarCount"),Ne=o(e=>{if(e.includes("*")){const[t,s]=e.split("*");return {prefix:t,suffix:s}}return e},"parsePattern"),Se=o(({prefix:e,suffix:t},s)=>s.startsWith(e)&&s.endsWith(t),"isPatternMatch"),Re=o((e,t,s)=>Object.entries(e).map(([n,l])=>(me(n,`Pattern '${n}' can have at most one '*' character.`),{pattern:Ne(n),substitutions:l.map(i=>{if(me(i,`Substitution '${i}' in pattern '${n}' can have at most one '*' character.`),!t&&!G.test(i))throw new Error("Non-relative paths are not allowed when 'baseUrl' is not set. Did you forget a leading './'?");return p$1.resolve(s,i)})})),"parsePaths");o(e=>{const{compilerOptions:t}=e.config;if(!t)return null;const{baseUrl:s,paths:n}=t;if(!s&&!n)return null;const l=X in t&&t[X],i=p$1.resolve(p$1.dirname(e.path),s||l||"."),u=n?Re(n,s,i):[];return f=>{if(G.test(f))return [];const r=[];for(const _ of u){if(_.pattern===f)return _.substitutions.map(E);typeof _.pattern!="string"&&r.push(_);}let g,T=-1;for(const _ of r)Se(_.pattern,f)&&_.pattern.prefix.length>T&&(T=_.pattern.prefix.length,g=_);if(!g)return s?[E(p$1.join(i,f))]:[];const b=f.slice(g.pattern.prefix.length,f.length-g.pattern.suffix.length);return g.substitutions.map(_=>E(_.replace("*",b)))}},"createPathsMatcher");const pe=o(e=>{let t="";for(let s=0;s<e.length;s+=1){const n=e[s],l=n.toUpperCase();t+=n===l?n.toLowerCase():l;}return t},"s"),We=65,Me=97,Ve=o(()=>Math.floor(Math.random()*26),"m"),Je=o(e=>Array.from({length:e},()=>String.fromCodePoint(Ve()+(Math.random()>.5?We:Me))).join(""),"S"),ze=o((e=Ae)=>{const t=process.execPath;if(e.existsSync(t))return !e.existsSync(pe(t));const s=`/${Je(10)}`;e.writeFileSync(s,"");const n=!e.existsSync(pe(s));return e.unlinkSync(s),n},"l"),{join:J}=p$1.posix,C={ts:[".ts",".tsx",".d.ts"],cts:[".cts",".d.cts"],mts:[".mts",".d.mts"]},Oe=o(e=>{const t=[...C.ts],s=[...C.cts],n=[...C.mts];return e!=null&&e.allowJs&&(t.push(".js",".jsx"),s.push(".cjs"),n.push(".mjs")),[...t,...s,...n]},"getSupportedExtensions"),Ge=o(e=>{const t=[];if(!e)return t;const{outDir:s,declarationDir:n}=e;return s&&t.push(s),n&&t.push(n),t},"getDefaultExcludeSpec"),ke=o(e=>e.replaceAll(/[.*+?^${}()|[\]\\]/g,String.raw`\$&`),"escapeForRegexp"),Qe=["node_modules","bower_components","jspm_packages"],ee=`(?!(${Qe.join("|")})(/|$))`,He=/(?:^|\/)[^.*?]+$/,we="**/*",z="[^/]",ne="[^./]",be=process.platform==="win32";o(({config:e,path:t},s=ze())=>{if("extends"in e)throw new Error("tsconfig#extends must be resolved. Use getTsconfig or parseTsconfig to resolve it.");if(!p$1.isAbsolute(t))throw new Error("The tsconfig path must be absolute");be&&(t=E(t));const n=p$1.dirname(t),{files:l,include:i,exclude:u,compilerOptions:f}=e,r=l==null?void 0:l.map(w=>J(n,w)),g=Oe(f),T=s?"":"i",_=(u||Ge(f)).map(w=>{const y=J(n,w),I=ke(y).replaceAll(String.raw`\*\*/`,"(.+/)?").replaceAll(String.raw`\*`,`${z}*`).replaceAll(String.raw`\?`,z);return new RegExp(`^${I}($|/)`,T)}),d=l||i?i:[we],A=d?d.map(w=>{let y=J(n,w);He.test(y)&&(y=J(y,we));const I=ke(y).replaceAll(String.raw`/\*\*`,`(/${ee}${ne}${z}*)*?`).replaceAll(/(\/)?\\\*/g,(L,c)=>{const k=`(${ne}|(\\.(?!min\\.js$))?)*`;return c?`/${ee}${ne}${k}`:k}).replaceAll(/(\/)?\\\?/g,(L,c)=>{const k=z;return c?`/${ee}${k}`:k});return new RegExp(`^${I}$`,T)}):void 0;return w=>{if(!p$1.isAbsolute(w))throw new Error("filePath must be absolute");if(be&&(w=E(w)),r!=null&&r.includes(w))return e;if(!(!g.some(y=>w.endsWith(y))||_.some(y=>y.test(w)))&&A&&A.some(y=>y.test(w)))return e}},"createFilesMatcher");

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const newLineRegExp = /\r?\n/;
const errCodeRegExp = /error TS(?<errCode>\d+)/;
async function makeTscErrorInfo(errInfo) {
	const [errFilePathPos = "", ...errMsgRawArr] = errInfo.split(":");
	if (!errFilePathPos || errMsgRawArr.length === 0 || errMsgRawArr.join("").length === 0) {
		return ["unknown filepath", null];
	}
	const errMsgRaw = errMsgRawArr.join("").trim();
	const [errFilePath, errPos] = errFilePathPos.slice(0, -1).split("(");
	if (!errFilePath || !errPos) {
		return ["unknown filepath", null];
	}
	const [errLine, errCol] = errPos.split(",");
	if (!errLine || !errCol) {
		return [errFilePath, null];
	}
	const execArr = errCodeRegExp.exec(errMsgRaw);
	if (!execArr) {
		return [errFilePath, null];
	}
	const errCodeStr = execArr.groups?.errCode ?? "";
	if (!errCodeStr) {
		return [errFilePath, null];
	}
	const line = Number(errLine);
	const col = Number(errCol);
	const errCode = Number(errCodeStr);
	return [errFilePath, {
		filePath: errFilePath,
		errCode,
		line,
		column: col,
		errMsg: errMsgRaw.slice(`error TS${errCode} `.length)
	}];
}
async function getTsconfig(root, config) {
	const configName = config.tsconfig ? basename(config.tsconfig) : undefined;
	const configSearchPath = config.tsconfig ? dirname(resolve(root, config.tsconfig)) : root;
	const tsconfig = he(configSearchPath, configName);
	if (!tsconfig) {
		throw new Error("no tsconfig.json found");
	}
	const tsconfigName = basename(tsconfig.path, ".json");
	const tempTsConfigName = `${tsconfigName}.vitest-temp.json`;
	const tempTsbuildinfoName = `${tsconfigName}.tmp.tsbuildinfo`;
	const tempConfigPath = join(dirname(tsconfig.path), tempTsConfigName);
	try {
		const tmpTsConfig = { ...tsconfig.config };
		tmpTsConfig.compilerOptions = tmpTsConfig.compilerOptions || {};
		tmpTsConfig.compilerOptions.emitDeclarationOnly = false;
		tmpTsConfig.compilerOptions.incremental = true;
		tmpTsConfig.compilerOptions.tsBuildInfoFile = join(process.versions.pnp ? join(nodeos__default.tmpdir(), "vitest") : __dirname, tempTsbuildinfoName);
		const tsconfigFinalContent = JSON.stringify(tmpTsConfig, null, 2);
		await writeFile(tempConfigPath, tsconfigFinalContent);
		return {
			path: tempConfigPath,
			config: tmpTsConfig
		};
	} catch (err) {
		throw new Error(`failed to write ${tempTsConfigName}`, { cause: err });
	}
}
async function getRawErrsMapFromTsCompile(tscErrorStdout) {
	const rawErrsMap = new Map();
	const infos = await Promise.all(tscErrorStdout.split(newLineRegExp).reduce((prev, next) => {
		if (!next) {
			return prev;
		} else if (!next.startsWith(" ")) {
			prev.push(next);
		} else {
			prev[prev.length - 1] += `\n${next}`;
		}
		return prev;
	}, []).map((errInfoLine) => makeTscErrorInfo(errInfoLine)));
	infos.forEach(([errFilePath, errInfo]) => {
		if (!errInfo) {
			return;
		}
		if (!rawErrsMap.has(errFilePath)) {
			rawErrsMap.set(errFilePath, [errInfo]);
		} else {
			rawErrsMap.get(errFilePath)?.push(errInfo);
		}
	});
	return rawErrsMap;
}

function createIndexMap(source) {
	const map = new Map();
	let index = 0;
	let line = 1;
	let column = 1;
	for (const char of source) {
		map.set(`${line}:${column}`, index++);
		if (char === "\n" || char === "\r\n") {
			line++;
			column = 0;
		} else {
			column++;
		}
	}
	return map;
}

class TypeCheckError extends Error {
	name = "TypeCheckError";
	constructor(message, stacks) {
		super(message);
		this.message = message;
		this.stacks = stacks;
	}
}
class Typechecker {
	_onParseStart;
	_onParseEnd;
	_onWatcherRerun;
	_result = {
		files: [],
		sourceErrors: [],
		time: 0
	};
	_startTime = 0;
	_output = "";
	_tests = {};
	tempConfigPath;
	allowJs;
	process;
	files = [];
	constructor(ctx) {
		this.ctx = ctx;
	}
	setFiles(files) {
		this.files = files;
	}
	onParseStart(fn) {
		this._onParseStart = fn;
	}
	onParseEnd(fn) {
		this._onParseEnd = fn;
	}
	onWatcherRerun(fn) {
		this._onWatcherRerun = fn;
	}
	async collectFileTests(filepath) {
		return collectTests(this.ctx, filepath);
	}
	getFiles() {
		return this.files.filter((filename) => {
			const extension = extname(filename);
			return extension !== ".js" || this.allowJs;
		});
	}
	async collectTests() {
		const tests = (await Promise.all(this.getFiles().map((filepath) => this.collectFileTests(filepath)))).reduce((acc, data) => {
			if (!data) {
				return acc;
			}
			acc[data.filepath] = data;
			return acc;
		}, {});
		this._tests = tests;
		return tests;
	}
	markPassed(file) {
		if (!file.result?.state) {
			file.result = { state: "pass" };
		}
		const markTasks = (tasks) => {
			for (const task of tasks) {
				if ("tasks" in task) {
					markTasks(task.tasks);
				}
				if (!task.result?.state && (task.mode === "run" || task.mode === "queued")) {
					task.result = { state: "pass" };
				}
			}
		};
		markTasks(file.tasks);
	}
	async prepareResults(output) {
		const typeErrors = await this.parseTscLikeOutput(output);
		const testFiles = new Set(this.getFiles());
		if (!this._tests) {
			this._tests = await this.collectTests();
		}
		const sourceErrors = [];
		const files = [];
		testFiles.forEach((path) => {
			const { file, definitions, map, parsed } = this._tests[path];
			const errors = typeErrors.get(path);
			files.push(file);
			if (!errors) {
				this.markPassed(file);
				return;
			}
			const sortedDefinitions = [...definitions.sort((a, b) => b.start - a.start)];
			const traceMap = map && new TraceMap(map);
			const indexMap = createIndexMap(parsed);
			const markState = (task, state) => {
				task.result = { state: task.mode === "run" || task.mode === "only" ? state : task.mode };
				if (task.suite) {
					markState(task.suite, state);
				} else if (task.file && task !== task.file) {
					markState(task.file, state);
				}
			};
			errors.forEach(({ error, originalError }) => {
				const processedPos = traceMap ? findGeneratedPosition(traceMap, {
					line: originalError.line,
					column: originalError.column,
					source: basename(path)
				}) : originalError;
				const line = processedPos.line ?? originalError.line;
				const column = processedPos.column ?? originalError.column;
				const index = indexMap.get(`${line}:${column}`);
				const definition = index != null && sortedDefinitions.find((def) => def.start <= index && def.end >= index);
				const suite = definition ? definition.task : file;
				const state = suite.mode === "run" || suite.mode === "only" ? "fail" : suite.mode;
				const errors = suite.result?.errors || [];
				suite.result = {
					state,
					errors
				};
				errors.push(error);
				if (state === "fail") {
					if (suite.suite) {
						markState(suite.suite, "fail");
					} else if (suite.file && suite !== suite.file) {
						markState(suite.file, "fail");
					}
				}
			});
			this.markPassed(file);
		});
		typeErrors.forEach((errors, path) => {
			if (!testFiles.has(path)) {
				sourceErrors.push(...errors.map(({ error }) => error));
			}
		});
		return {
			files,
			sourceErrors,
			time: performance.now() - this._startTime
		};
	}
	async parseTscLikeOutput(output) {
		const errorsMap = await getRawErrsMapFromTsCompile(output);
		const typesErrors = new Map();
		errorsMap.forEach((errors, path) => {
			const filepath = resolve(this.ctx.config.root, path);
			const suiteErrors = errors.map((info) => {
				const limit = Error.stackTraceLimit;
				Error.stackTraceLimit = 0;
				const errMsg = info.errMsg.replace(/\r?\n\s*(Type .* has no call signatures)/g, " $1");
				const error = new TypeCheckError(errMsg, [{
					file: filepath,
					line: info.line,
					column: info.column,
					method: ""
				}]);
				Error.stackTraceLimit = limit;
				return {
					originalError: info,
					error: {
						name: error.name,
						nameStr: String(error.name),
						message: errMsg,
						stacks: error.stacks,
						stack: "",
						stackStr: ""
					}
				};
			});
			typesErrors.set(filepath, suiteErrors);
		});
		return typesErrors;
	}
	async clear() {
		if (this.tempConfigPath) {
			await rm(this.tempConfigPath, { force: true });
		}
	}
	async stop() {
		await this.clear();
		this.process?.kill();
		this.process = undefined;
	}
	async ensurePackageInstalled(ctx, checker) {
		if (checker !== "tsc" && checker !== "vue-tsc") {
			return;
		}
		const packageName = checker === "tsc" ? "typescript" : "vue-tsc";
		await ctx.packageInstaller.ensureInstalled(packageName, ctx.config.root);
	}
	async prepare() {
		const { root, typecheck } = this.ctx.config;
		const { config, path } = await getTsconfig(root, typecheck);
		this.tempConfigPath = path;
		this.allowJs = typecheck.allowJs || config.allowJs || false;
	}
	getExitCode() {
		return this.process?.exitCode != null && this.process.exitCode;
	}
	getOutput() {
		return this._output;
	}
	async start() {
		if (this.process) {
			return;
		}
		if (!this.tempConfigPath) {
			throw new Error("tsconfig was not initialized");
		}
		const { root, watch, typecheck } = this.ctx.config;
		const args = [
			"--noEmit",
			"--pretty",
			"false",
			"-p",
			this.tempConfigPath
		];
		if (watch) {
			args.push("--watch");
		}
		if (typecheck.allowJs) {
			args.push("--allowJs", "--checkJs");
		}
		this._output = "";
		this._startTime = performance.now();
		const child = x$1(typecheck.checker, args, {
			nodeOptions: {
				cwd: root,
				stdio: "pipe"
			},
			throwOnError: false
		});
		this.process = child.process;
		await this._onParseStart?.();
		let rerunTriggered = false;
		child.process?.stdout?.on("data", (chunk) => {
			this._output += chunk;
			if (!watch) {
				return;
			}
			if (this._output.includes("File change detected") && !rerunTriggered) {
				this._onWatcherRerun?.();
				this._startTime = performance.now();
				this._result.sourceErrors = [];
				this._result.files = [];
				this._tests = null;
				rerunTriggered = true;
			}
			if (/Found \w+ errors*. Watching for/.test(this._output)) {
				rerunTriggered = false;
				this.prepareResults(this._output).then((result) => {
					this._result = result;
					this._onParseEnd?.(result);
				});
				this._output = "";
			}
		});
		if (!watch) {
			await child;
			this._result = await this.prepareResults(this._output);
			await this._onParseEnd?.(this._result);
		}
	}
	getResult() {
		return this._result;
	}
	getTestFiles() {
		return Object.values(this._tests || {}).map((i) => i.file);
	}
	getTestPacksAndEvents() {
		const packs = [];
		const events = [];
		for (const { file } of Object.values(this._tests || {})) {
			const result = convertTasksToEvents(file);
			packs.push(...result.packs);
			events.push(...result.events);
		}
		return {
			packs,
			events
		};
	}
}
function findGeneratedPosition(traceMap, { line, column, source }) {
	const found = generatedPositionFor(traceMap, {
		line,
		column,
		source
	});
	if (found.line !== null) {
		return found;
	}
	const mappings = [];
	eachMapping(traceMap, (m) => {
		if (m.source === source && m.originalLine !== null && m.originalColumn !== null && (line === m.originalLine ? column < m.originalColumn : line < m.originalLine)) {
			mappings.push(m);
		}
	});
	const next = mappings.sort((a, b) => a.originalLine === b.originalLine ? a.originalColumn - b.originalColumn : a.originalLine - b.originalLine).at(0);
	if (next) {
		return {
			line: next.generatedLine,
			column: next.generatedColumn
		};
	}
	return {
		line: null,
		column: null
	};
}

export { TypeCheckError as T, Typechecker as a, convertTasksToEvents as c, getOutputFile as g, hasFailedSnapshot as h, wrapSerializableConfig as w };
