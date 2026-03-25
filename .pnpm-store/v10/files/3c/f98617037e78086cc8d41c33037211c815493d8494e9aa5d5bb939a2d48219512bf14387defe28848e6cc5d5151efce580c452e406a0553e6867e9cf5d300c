import selection_select from "./select.js";
import selection_selectAll from "./selectAll.js";
import selection_selectChild from "./selectChild.js";
import selection_selectChildren from "./selectChildren.js";
import selection_filter from "./filter.js";
import selection_data from "./data.js";
import selection_enter from "./enter.js";
import selection_exit from "./exit.js";
import selection_join from "./join.js";
import selection_merge from "./merge.js";
import selection_order from "./order.js";
import selection_sort from "./sort.js";
import selection_call from "./call.js";
import selection_nodes from "./nodes.js";
import selection_node from "./node.js";
import selection_size from "./size.js";
import selection_empty from "./empty.js";
import selection_each from "./each.js";
import selection_attr from "./attr.js";
import selection_style from "./style.js";
import selection_property from "./property.js";
import selection_classed from "./classed.js";
import selection_text from "./text.js";
import selection_html from "./html.js";
import selection_raise from "./raise.js";
import selection_lower from "./lower.js";
import selection_append from "./append.js";
import selection_insert from "./insert.js";
import selection_remove from "./remove.js";
import selection_clone from "./clone.js";
import selection_datum from "./datum.js";
import selection_on from "./on.js";
import selection_dispatch from "./dispatch.js";
import selection_iterator from "./iterator.js";

export var root = [null];

export function Selection(groups, parents) {
  this._groups = groups;
  this._parents = parents;
}

function selection() {
  return new Selection([[document.documentElement]], root);
}

function selection_selection() {
  return this;
}

Selection.prototype = selection.prototype = {
  constructor: Selection,
  select: selection_select,
  selectAll: selection_selectAll,
  selectChild: selection_selectChild,
  selectChildren: selection_selectChildren,
  filter: selection_filter,
  data: selection_data,
  enter: selection_enter,
  exit: selection_exit,
  join: selection_join,
  merge: selection_merge,
  selection: selection_selection,
  order: selection_order,
  sort: selection_sort,
  call: selection_call,
  nodes: selection_nodes,
  node: selection_node,
  size: selection_size,
  empty: selection_empty,
  each: selection_each,
  attr: selection_attr,
  style: selection_style,
  property: selection_property,
  classed: selection_classed,
  text: selection_text,
  html: selection_html,
  raise: selection_raise,
  lower: selection_lower,
  append: selection_append,
  insert: selection_insert,
  remove: selection_remove,
  clone: selection_clone,
  datum: selection_datum,
  on: selection_on,
  dispatch: selection_dispatch,
  [Symbol.iterator]: selection_iterator
};

export default selection;
