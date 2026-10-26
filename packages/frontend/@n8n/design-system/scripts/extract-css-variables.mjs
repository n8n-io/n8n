import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { dirname, resolve, relative, extname, basename } from 'node:path';
import { parse } from '@vue/compiler-sfc';
import scss from 'postcss-scss';
import valueParser from 'postcss-value-parser';

/** Extract source occurrences, not computed values or cascade results. */
export function extractCssVariables(file, root) {
 const entries = new Map();
 const visited = new Set();
 function publicName(name) { return name.startsWith('--n8n-') && !name.startsWith('--n8n--'); }
 function localFile(specifier, from) {
  if (!specifier || specifier.includes(':') || specifier.startsWith('~')) return null;
  if (specifier.startsWith('@n8n/design-system/')) specifier = resolve(root, 'src', specifier.slice('@n8n/design-system/'.length));
  else if (specifier.startsWith('@')) return null;
  const target = resolve(dirname(from), specifier);
  const candidates = [target, `${target}.scss`, `${target}.css`, resolve(dirname(target), `_${basename(target)}.scss`), resolve(target, '_index.scss')];
  for (const candidate of candidates) {
   if (!existsSync(candidate)) continue;
   const real = realpathSync(candidate);
   if (!relative(root, real).startsWith('..') && ['.css', '.scss'].includes(extname(real))) return real;
  }
  throw new Error(`Cannot resolve local stylesheet ${specifier} from ${from}`);
 }
 function style(text, from, offset = 0, scoped = false) {
  const tree = scss.parse(text, { from });
  tree.walkAtRules((rule) => {
   if (!['import', 'use', 'forward'].includes(rule.name)) return;
   const params = valueParser(rule.params);
   for (const node of params.nodes) {
    if (node.type !== 'string') continue;
    const imported = localFile(node.value, from);
    if (imported) visit(imported, scoped);
   }
  });
  tree.walkDecls((decl) => {
   const selectors = [];
   const conditions = [];
   for (let parent = decl.parent; parent; parent = parent.parent) {
    if (parent.type === 'rule') selectors.unshift(parent.selector);
    if (parent.type === 'atrule') conditions.unshift(`@${parent.name} ${parent.params}`);
   }
   function add(name, value, kind) {
    if (!publicName(name)) return;
    if (!entries.has(name)) entries.set(name, { name, default: null, description: '', scope: 'See occurrences; check the cascade before overriding.', occurrences: [] });
    const entry = entries.get(name);
    entry.occurrences.push({ kind, default: value, selector: selectors.join(' / ') || null, conditions, scoped, source: { file: relative(root, from), line: offset + decl.source.start.line } });
   }
   if (publicName(decl.prop)) add(decl.prop, decl.value, 'declaration');
   valueParser(decl.value).walk((node) => {
    if (node.type !== 'function' || node.value !== 'var') return;
    const comma = node.nodes.findIndex((part) => part.type === 'div' && part.value === ',');
    const name = valueParser.stringify(comma < 0 ? node.nodes : node.nodes.slice(0, comma)).trim();
    add(name, comma < 0 ? null : valueParser.stringify(node.nodes.slice(comma + 1)).trim(), 'reference');
   });
  });
 }
 function visit(target, scoped = false) {
  const key = `${realpathSync(target)}:${scoped}`;
  if (visited.has(key)) return;
  visited.add(key);
  const text = readFileSync(target, 'utf8');
  if (target.endsWith('.vue')) {
   const { descriptor, errors } = parse(text, { filename: target });
   if (errors.length) throw new Error(`Cannot parse ${target}: ${errors.join(', ')}`);
   for (const block of descriptor.styles) {
    if (block.src) { const imported = localFile(block.src, target); if (imported) visit(imported, !!block.scoped); }
    else style(block.content, target, block.loc.start.line - 1, !!block.scoped);
   }
  } else style(text, target, 0, scoped);
 }
 visit(file);
 for (const entry of entries.values()) {
  const defaults = [...new Set(entry.occurrences.map((item) => item.default))];
  entry.default = defaults.length === 1 ? defaults[0] : null;
 }
 return [...entries.values()].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}
