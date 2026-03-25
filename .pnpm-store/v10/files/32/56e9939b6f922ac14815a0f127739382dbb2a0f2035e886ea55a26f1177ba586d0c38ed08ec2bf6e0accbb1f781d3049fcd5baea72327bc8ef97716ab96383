import {selection} from "d3-selection";
import transition_attr from "./attr.js";
import transition_attrTween from "./attrTween.js";
import transition_delay from "./delay.js";
import transition_duration from "./duration.js";
import transition_ease from "./ease.js";
import transition_easeVarying from "./easeVarying.js";
import transition_filter from "./filter.js";
import transition_merge from "./merge.js";
import transition_on from "./on.js";
import transition_remove from "./remove.js";
import transition_select from "./select.js";
import transition_selectAll from "./selectAll.js";
import transition_selection from "./selection.js";
import transition_style from "./style.js";
import transition_styleTween from "./styleTween.js";
import transition_text from "./text.js";
import transition_textTween from "./textTween.js";
import transition_transition from "./transition.js";
import transition_tween from "./tween.js";
import transition_end from "./end.js";

var id = 0;

export function Transition(groups, parents, name, id) {
  this._groups = groups;
  this._parents = parents;
  this._name = name;
  this._id = id;
}

export default function transition(name) {
  return selection().transition(name);
}

export function newId() {
  return ++id;
}

var selection_prototype = selection.prototype;

Transition.prototype = transition.prototype = {
  constructor: Transition,
  select: transition_select,
  selectAll: transition_selectAll,
  selectChild: selection_prototype.selectChild,
  selectChildren: selection_prototype.selectChildren,
  filter: transition_filter,
  merge: transition_merge,
  selection: transition_selection,
  transition: transition_transition,
  call: selection_prototype.call,
  nodes: selection_prototype.nodes,
  node: selection_prototype.node,
  size: selection_prototype.size,
  empty: selection_prototype.empty,
  each: selection_prototype.each,
  on: transition_on,
  attr: transition_attr,
  attrTween: transition_attrTween,
  style: transition_style,
  styleTween: transition_styleTween,
  text: transition_text,
  textTween: transition_textTween,
  remove: transition_remove,
  tween: transition_tween,
  delay: transition_delay,
  duration: transition_duration,
  ease: transition_ease,
  easeVarying: transition_easeVarying,
  end: transition_end,
  [Symbol.iterator]: selection_prototype[Symbol.iterator]
};
