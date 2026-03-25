/**
* @vue/compiler-ssr v3.5.26
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var compilerDom = require('@vue/compiler-dom');
var shared = require('@vue/shared');

const SSR_INTERPOLATE = /* @__PURE__ */ Symbol(`ssrInterpolate`);
const SSR_RENDER_VNODE = /* @__PURE__ */ Symbol(`ssrRenderVNode`);
const SSR_RENDER_COMPONENT = /* @__PURE__ */ Symbol(`ssrRenderComponent`);
const SSR_RENDER_SLOT = /* @__PURE__ */ Symbol(`ssrRenderSlot`);
const SSR_RENDER_SLOT_INNER = /* @__PURE__ */ Symbol(`ssrRenderSlotInner`);
const SSR_RENDER_CLASS = /* @__PURE__ */ Symbol(`ssrRenderClass`);
const SSR_RENDER_STYLE = /* @__PURE__ */ Symbol(`ssrRenderStyle`);
const SSR_RENDER_ATTRS = /* @__PURE__ */ Symbol(`ssrRenderAttrs`);
const SSR_RENDER_ATTR = /* @__PURE__ */ Symbol(`ssrRenderAttr`);
const SSR_RENDER_DYNAMIC_ATTR = /* @__PURE__ */ Symbol(`ssrRenderDynamicAttr`);
const SSR_RENDER_LIST = /* @__PURE__ */ Symbol(`ssrRenderList`);
const SSR_INCLUDE_BOOLEAN_ATTR = /* @__PURE__ */ Symbol(
  `ssrIncludeBooleanAttr`
);
const SSR_LOOSE_EQUAL = /* @__PURE__ */ Symbol(`ssrLooseEqual`);
const SSR_LOOSE_CONTAIN = /* @__PURE__ */ Symbol(`ssrLooseContain`);
const SSR_RENDER_DYNAMIC_MODEL = /* @__PURE__ */ Symbol(
  `ssrRenderDynamicModel`
);
const SSR_GET_DYNAMIC_MODEL_PROPS = /* @__PURE__ */ Symbol(
  `ssrGetDynamicModelProps`
);
const SSR_RENDER_TELEPORT = /* @__PURE__ */ Symbol(`ssrRenderTeleport`);
const SSR_RENDER_SUSPENSE = /* @__PURE__ */ Symbol(`ssrRenderSuspense`);
const SSR_GET_DIRECTIVE_PROPS = /* @__PURE__ */ Symbol(`ssrGetDirectiveProps`);
const ssrHelpers = {
  [SSR_INTERPOLATE]: `ssrInterpolate`,
  [SSR_RENDER_VNODE]: `ssrRenderVNode`,
  [SSR_RENDER_COMPONENT]: `ssrRenderComponent`,
  [SSR_RENDER_SLOT]: `ssrRenderSlot`,
  [SSR_RENDER_SLOT_INNER]: `ssrRenderSlotInner`,
  [SSR_RENDER_CLASS]: `ssrRenderClass`,
  [SSR_RENDER_STYLE]: `ssrRenderStyle`,
  [SSR_RENDER_ATTRS]: `ssrRenderAttrs`,
  [SSR_RENDER_ATTR]: `ssrRenderAttr`,
  [SSR_RENDER_DYNAMIC_ATTR]: `ssrRenderDynamicAttr`,
  [SSR_RENDER_LIST]: `ssrRenderList`,
  [SSR_INCLUDE_BOOLEAN_ATTR]: `ssrIncludeBooleanAttr`,
  [SSR_LOOSE_EQUAL]: `ssrLooseEqual`,
  [SSR_LOOSE_CONTAIN]: `ssrLooseContain`,
  [SSR_RENDER_DYNAMIC_MODEL]: `ssrRenderDynamicModel`,
  [SSR_GET_DYNAMIC_MODEL_PROPS]: `ssrGetDynamicModelProps`,
  [SSR_RENDER_TELEPORT]: `ssrRenderTeleport`,
  [SSR_RENDER_SUSPENSE]: `ssrRenderSuspense`,
  [SSR_GET_DIRECTIVE_PROPS]: `ssrGetDirectiveProps`
};
compilerDom.registerRuntimeHelpers(ssrHelpers);

const ssrTransformIf = compilerDom.createStructuralDirectiveTransform(
  /^(?:if|else|else-if)$/,
  compilerDom.processIf
);
function ssrProcessIf(node, context, disableNestedFragments = false, disableComment = false) {
  const [rootBranch] = node.branches;
  const ifStatement = compilerDom.createIfStatement(
    rootBranch.condition,
    processIfBranch(rootBranch, context, disableNestedFragments)
  );
  context.pushStatement(ifStatement);
  let currentIf = ifStatement;
  for (let i = 1; i < node.branches.length; i++) {
    const branch = node.branches[i];
    const branchBlockStatement = processIfBranch(
      branch,
      context,
      disableNestedFragments
    );
    if (branch.condition) {
      currentIf = currentIf.alternate = compilerDom.createIfStatement(
        branch.condition,
        branchBlockStatement
      );
    } else {
      currentIf.alternate = branchBlockStatement;
    }
  }
  if (!currentIf.alternate && !disableComment) {
    currentIf.alternate = compilerDom.createBlockStatement([
      compilerDom.createCallExpression(`_push`, ["`<!---->`"])
    ]);
  }
}
function processIfBranch(branch, context, disableNestedFragments = false) {
  const { children } = branch;
  const needFragmentWrapper = !disableNestedFragments && (children.length !== 1 || children[0].type !== 1) && // optimize away nested fragments when the only child is a ForNode
  !(children.length === 1 && children[0].type === 11);
  return processChildrenAsStatement(branch, context, needFragmentWrapper);
}

const ssrTransformFor = compilerDom.createStructuralDirectiveTransform("for", compilerDom.processFor);
function ssrProcessFor(node, context, disableNestedFragments = false) {
  const needFragmentWrapper = !disableNestedFragments && (node.children.length !== 1 || node.children[0].type !== 1);
  const renderLoop = compilerDom.createFunctionExpression(
    compilerDom.createForLoopParams(node.parseResult)
  );
  renderLoop.body = processChildrenAsStatement(
    node,
    context,
    needFragmentWrapper
  );
  if (!disableNestedFragments) {
    context.pushStringPart(`<!--[-->`);
  }
  context.pushStatement(
    compilerDom.createCallExpression(context.helper(SSR_RENDER_LIST), [
      node.source,
      renderLoop
    ])
  );
  if (!disableNestedFragments) {
    context.pushStringPart(`<!--]-->`);
  }
}

const ssrTransformSlotOutlet = (node, context) => {
  if (compilerDom.isSlotOutlet(node)) {
    const { slotName, slotProps } = compilerDom.processSlotOutlet(node, context);
    const args = [
      `_ctx.$slots`,
      slotName,
      slotProps || `{}`,
      // fallback content placeholder. will be replaced in the process phase
      `null`,
      `_push`,
      `_parent`
    ];
    if (context.scopeId && context.slotted !== false) {
      args.push(`"${context.scopeId}-s"`);
    }
    let method = SSR_RENDER_SLOT;
    let parent = context.parent;
    if (parent) {
      const children = parent.children;
      if (parent.type === 10) {
        parent = context.grandParent;
      }
      let componentType;
      if (parent.type === 1 && parent.tagType === 1 && ((componentType = compilerDom.resolveComponentType(parent, context, true)) === compilerDom.TRANSITION || componentType === compilerDom.TRANSITION_GROUP) && children.filter((c) => c.type === 1).length === 1) {
        method = SSR_RENDER_SLOT_INNER;
        if (!(context.scopeId && context.slotted !== false)) {
          args.push("null");
        }
        args.push("true");
      }
    }
    node.ssrCodegenNode = compilerDom.createCallExpression(context.helper(method), args);
  }
};
function ssrProcessSlotOutlet(node, context) {
  const renderCall = node.ssrCodegenNode;
  if (node.children.length) {
    const fallbackRenderFn = compilerDom.createFunctionExpression([]);
    fallbackRenderFn.body = processChildrenAsStatement(node, context);
    renderCall.arguments[3] = fallbackRenderFn;
  }
  if (context.withSlotScopeId) {
    const slotScopeId = renderCall.arguments[6];
    renderCall.arguments[6] = slotScopeId ? `${slotScopeId} + _scopeId` : `_scopeId`;
  }
  context.pushStatement(node.ssrCodegenNode);
}

function createSSRCompilerError(code, loc) {
  return compilerDom.createCompilerError(code, loc, SSRErrorMessages);
}
const SSRErrorMessages = {
  [65]: `Unsafe attribute name for SSR.`,
  [66]: `Missing the 'to' prop on teleport element.`,
  [67]: `Invalid AST node during SSR transform.`
};

function ssrProcessTeleport(node, context) {
  const targetProp = compilerDom.findProp(node, "to");
  if (!targetProp) {
    context.onError(
      createSSRCompilerError(66, node.loc)
    );
    return;
  }
  let target;
  if (targetProp.type === 6) {
    target = targetProp.value && compilerDom.createSimpleExpression(targetProp.value.content, true);
  } else {
    target = targetProp.exp;
  }
  if (!target) {
    context.onError(
      createSSRCompilerError(
        66,
        targetProp.loc
      )
    );
    return;
  }
  const disabledProp = compilerDom.findProp(
    node,
    "disabled",
    false,
    true
    /* allow empty */
  );
  const disabled = disabledProp ? disabledProp.type === 6 ? `true` : disabledProp.exp || `false` : `false`;
  const contentRenderFn = compilerDom.createFunctionExpression(
    [`_push`],
    void 0,
    // Body is added later
    true,
    // newline
    false,
    // isSlot
    node.loc
  );
  contentRenderFn.body = processChildrenAsStatement(node, context);
  context.pushStatement(
    compilerDom.createCallExpression(context.helper(SSR_RENDER_TELEPORT), [
      `_push`,
      contentRenderFn,
      target,
      disabled,
      `_parent`
    ])
  );
}

const wipMap$3 = /* @__PURE__ */ new WeakMap();
function ssrTransformSuspense(node, context) {
  return () => {
    if (node.children.length) {
      const wipEntry = {
        slotsExp: null,
        // to be immediately set
        wipSlots: []
      };
      wipMap$3.set(node, wipEntry);
      wipEntry.slotsExp = compilerDom.buildSlots(
        node,
        context,
        (_props, _vForExp, children, loc) => {
          const fn = compilerDom.createFunctionExpression(
            [],
            void 0,
            // no return, assign body later
            true,
            // newline
            false,
            // suspense slots are not treated as normal slots
            loc
          );
          wipEntry.wipSlots.push({
            fn,
            children
          });
          return fn;
        }
      ).slots;
    }
  };
}
function ssrProcessSuspense(node, context) {
  const wipEntry = wipMap$3.get(node);
  if (!wipEntry) {
    return;
  }
  const { slotsExp, wipSlots } = wipEntry;
  for (let i = 0; i < wipSlots.length; i++) {
    const slot = wipSlots[i];
    slot.fn.body = processChildrenAsStatement(slot, context);
  }
  context.pushStatement(
    compilerDom.createCallExpression(context.helper(SSR_RENDER_SUSPENSE), [
      `_push`,
      slotsExp
    ])
  );
}

const rawChildrenMap = /* @__PURE__ */ new WeakMap();
const ssrTransformElement = (node, context) => {
  if (node.type !== 1 || node.tagType !== 0) {
    return;
  }
  return function ssrPostTransformElement() {
    const openTag = [`<${node.tag}`];
    const needTagForRuntime = node.tag === "textarea" || node.tag.indexOf("-") > 0;
    const hasDynamicVBind = compilerDom.hasDynamicKeyVBind(node);
    const hasCustomDir = node.props.some(
      (p) => p.type === 7 && !shared.isBuiltInDirective(p.name)
    );
    const vShowPropIndex = node.props.findIndex(
      (i) => i.type === 7 && i.name === "show"
    );
    if (vShowPropIndex !== -1) {
      const vShowProp = node.props[vShowPropIndex];
      node.props.splice(vShowPropIndex, 1);
      node.props.push(vShowProp);
    }
    const needMergeProps = hasDynamicVBind || hasCustomDir;
    if (needMergeProps) {
      const { props, directives } = compilerDom.buildProps(
        node,
        context,
        node.props,
        false,
        false,
        true
      );
      if (props || directives.length) {
        const mergedProps = buildSSRProps(props, directives, context);
        const propsExp = compilerDom.createCallExpression(
          context.helper(SSR_RENDER_ATTRS),
          [mergedProps]
        );
        if (node.tag === "textarea") {
          const existingText = node.children[0];
          if (!hasContentOverrideDirective(node) && (!existingText || existingText.type !== 5)) {
            const tempId = `_temp${context.temps++}`;
            propsExp.arguments = [
              compilerDom.createAssignmentExpression(
                compilerDom.createSimpleExpression(tempId, false),
                mergedProps
              )
            ];
            rawChildrenMap.set(
              node,
              compilerDom.createCallExpression(context.helper(SSR_INTERPOLATE), [
                compilerDom.createConditionalExpression(
                  compilerDom.createSimpleExpression(`"value" in ${tempId}`, false),
                  compilerDom.createSimpleExpression(`${tempId}.value`, false),
                  compilerDom.createSimpleExpression(
                    existingText ? existingText.content : ``,
                    true
                  ),
                  false
                )
              ])
            );
          }
        } else if (node.tag === "input") {
          const vModel = findVModel(node);
          if (vModel) {
            const tempId = `_temp${context.temps++}`;
            const tempExp = compilerDom.createSimpleExpression(tempId, false);
            propsExp.arguments = [
              compilerDom.createSequenceExpression([
                compilerDom.createAssignmentExpression(tempExp, mergedProps),
                compilerDom.createCallExpression(context.helper(compilerDom.MERGE_PROPS), [
                  tempExp,
                  compilerDom.createCallExpression(
                    context.helper(SSR_GET_DYNAMIC_MODEL_PROPS),
                    [
                      tempExp,
                      // existing props
                      vModel.exp
                      // model
                    ]
                  )
                ])
              ])
            ];
          }
        } else if (directives.length && !node.children.length) {
          if (!hasContentOverrideDirective(node)) {
            const tempId = `_temp${context.temps++}`;
            propsExp.arguments = [
              compilerDom.createAssignmentExpression(
                compilerDom.createSimpleExpression(tempId, false),
                mergedProps
              )
            ];
            rawChildrenMap.set(
              node,
              compilerDom.createConditionalExpression(
                compilerDom.createSimpleExpression(`"textContent" in ${tempId}`, false),
                compilerDom.createCallExpression(context.helper(SSR_INTERPOLATE), [
                  compilerDom.createSimpleExpression(`${tempId}.textContent`, false)
                ]),
                compilerDom.createSimpleExpression(`${tempId}.innerHTML ?? ''`, false),
                false
              )
            );
          }
        }
        if (needTagForRuntime) {
          propsExp.arguments.push(`"${node.tag}"`);
        }
        openTag.push(propsExp);
      }
    }
    let dynamicClassBinding = void 0;
    let staticClassBinding = void 0;
    let dynamicStyleBinding = void 0;
    for (let i = 0; i < node.props.length; i++) {
      const prop = node.props[i];
      if (node.tag === "input" && isTrueFalseValue(prop)) {
        continue;
      }
      if (prop.type === 7) {
        if (prop.name === "html" && prop.exp) {
          rawChildrenMap.set(
            node,
            compilerDom.createCompoundExpression([`(`, prop.exp, `) ?? ''`])
          );
        } else if (prop.name === "text" && prop.exp) {
          node.children = [compilerDom.createInterpolation(prop.exp, prop.loc)];
        } else if (prop.name === "slot") {
          context.onError(
            compilerDom.createCompilerError(40, prop.loc)
          );
        } else if (isTextareaWithValue(node, prop) && prop.exp) {
          if (!needMergeProps) {
            node.children = [compilerDom.createInterpolation(prop.exp, prop.loc)];
          }
        } else if (!needMergeProps && prop.name !== "on") {
          const directiveTransform = context.directiveTransforms[prop.name];
          if (directiveTransform) {
            const { props, ssrTagParts } = directiveTransform(
              prop,
              node,
              context
            );
            if (ssrTagParts) {
              openTag.push(...ssrTagParts);
            }
            for (let j = 0; j < props.length; j++) {
              const { key, value } = props[j];
              if (compilerDom.isStaticExp(key)) {
                let attrName = key.content;
                if (attrName === "key" || attrName === "ref") {
                  continue;
                }
                if (attrName === "class") {
                  openTag.push(
                    ` class="`,
                    dynamicClassBinding = compilerDom.createCallExpression(
                      context.helper(SSR_RENDER_CLASS),
                      [value]
                    ),
                    `"`
                  );
                } else if (attrName === "style") {
                  if (dynamicStyleBinding) {
                    mergeCall(dynamicStyleBinding, value);
                  } else {
                    openTag.push(
                      ` style="`,
                      dynamicStyleBinding = compilerDom.createCallExpression(
                        context.helper(SSR_RENDER_STYLE),
                        [value]
                      ),
                      `"`
                    );
                  }
                } else {
                  attrName = node.tag.indexOf("-") > 0 ? attrName : shared.propsToAttrMap[attrName] || attrName.toLowerCase();
                  if (shared.isBooleanAttr(attrName)) {
                    openTag.push(
                      compilerDom.createConditionalExpression(
                        compilerDom.createCallExpression(
                          context.helper(SSR_INCLUDE_BOOLEAN_ATTR),
                          [value]
                        ),
                        compilerDom.createSimpleExpression(" " + attrName, true),
                        compilerDom.createSimpleExpression("", true),
                        false
                      )
                    );
                  } else if (shared.isSSRSafeAttrName(attrName)) {
                    openTag.push(
                      compilerDom.createCallExpression(context.helper(SSR_RENDER_ATTR), [
                        key,
                        value
                      ])
                    );
                  } else {
                    context.onError(
                      createSSRCompilerError(
                        65,
                        key.loc
                      )
                    );
                  }
                }
              } else {
                const args = [key, value];
                if (needTagForRuntime) {
                  args.push(`"${node.tag}"`);
                }
                openTag.push(
                  compilerDom.createCallExpression(
                    context.helper(SSR_RENDER_DYNAMIC_ATTR),
                    args
                  )
                );
              }
            }
          }
        }
      } else {
        const name = prop.name;
        if (node.tag === "textarea" && name === "value" && prop.value) {
          rawChildrenMap.set(node, shared.escapeHtml(prop.value.content));
        } else if (!needMergeProps) {
          if (name === "key" || name === "ref") {
            continue;
          }
          if (name === "class" && prop.value) {
            staticClassBinding = JSON.stringify(prop.value.content);
          }
          openTag.push(
            ` ${prop.name}` + (prop.value ? `="${shared.escapeHtml(prop.value.content)}"` : ``)
          );
        }
      }
    }
    if (dynamicClassBinding && staticClassBinding) {
      mergeCall(dynamicClassBinding, staticClassBinding);
      removeStaticBinding(openTag, "class");
    }
    if (context.scopeId) {
      openTag.push(` ${context.scopeId}`);
    }
    node.ssrCodegenNode = compilerDom.createTemplateLiteral(openTag);
  };
};
function buildSSRProps(props, directives, context) {
  let mergePropsArgs = [];
  if (props) {
    if (props.type === 14) {
      mergePropsArgs = props.arguments;
    } else {
      mergePropsArgs.push(props);
    }
  }
  if (directives.length) {
    for (const dir of directives) {
      mergePropsArgs.push(
        compilerDom.createCallExpression(context.helper(SSR_GET_DIRECTIVE_PROPS), [
          `_ctx`,
          ...compilerDom.buildDirectiveArgs(dir, context).elements
        ])
      );
    }
  }
  return mergePropsArgs.length > 1 ? compilerDom.createCallExpression(context.helper(compilerDom.MERGE_PROPS), mergePropsArgs) : mergePropsArgs[0];
}
function isTrueFalseValue(prop) {
  if (prop.type === 7) {
    return prop.name === "bind" && prop.arg && compilerDom.isStaticExp(prop.arg) && (prop.arg.content === "true-value" || prop.arg.content === "false-value");
  } else {
    return prop.name === "true-value" || prop.name === "false-value";
  }
}
function isTextareaWithValue(node, prop) {
  return !!(node.tag === "textarea" && prop.name === "bind" && compilerDom.isStaticArgOf(prop.arg, "value"));
}
function mergeCall(call, arg) {
  const existing = call.arguments[0];
  if (existing.type === 17) {
    existing.elements.push(arg);
  } else {
    call.arguments[0] = compilerDom.createArrayExpression([existing, arg]);
  }
}
function removeStaticBinding(tag, binding) {
  const regExp = new RegExp(`^ ${binding}=".+"$`);
  const i = tag.findIndex((e) => typeof e === "string" && regExp.test(e));
  if (i > -1) {
    tag.splice(i, 1);
  }
}
function findVModel(node) {
  return node.props.find(
    (p) => p.type === 7 && p.name === "model" && p.exp
  );
}
function hasContentOverrideDirective(node) {
  return !!compilerDom.findDir(node, "text") || !!compilerDom.findDir(node, "html");
}
function ssrProcessElement(node, context) {
  const isVoidTag = context.options.isVoidTag || shared.NO;
  const elementsToAdd = node.ssrCodegenNode.elements;
  for (let j = 0; j < elementsToAdd.length; j++) {
    context.pushStringPart(elementsToAdd[j]);
  }
  if (context.withSlotScopeId) {
    context.pushStringPart(compilerDom.createSimpleExpression(`_scopeId`, false));
  }
  context.pushStringPart(`>`);
  const rawChildren = rawChildrenMap.get(node);
  if (rawChildren) {
    context.pushStringPart(rawChildren);
  } else if (node.children.length) {
    processChildren(node, context);
  }
  if (!isVoidTag(node.tag)) {
    context.pushStringPart(`</${node.tag}>`);
  }
}

const wipMap$2 = /* @__PURE__ */ new WeakMap();
function ssrTransformTransitionGroup(node, context) {
  return () => {
    const tag = compilerDom.findProp(node, "tag");
    if (tag) {
      const otherProps = node.props.filter((p) => p !== tag);
      const { props, directives } = compilerDom.buildProps(
        node,
        context,
        otherProps,
        true,
        false,
        true
      );
      let propsExp = null;
      if (props || directives.length) {
        propsExp = compilerDom.createCallExpression(context.helper(SSR_RENDER_ATTRS), [
          buildSSRProps(props, directives, context)
        ]);
      }
      wipMap$2.set(node, {
        tag,
        propsExp,
        scopeId: context.scopeId || null
      });
    }
  };
}
function ssrProcessTransitionGroup(node, context) {
  const entry = wipMap$2.get(node);
  if (entry) {
    const { tag, propsExp, scopeId } = entry;
    if (tag.type === 7) {
      context.pushStringPart(`<`);
      context.pushStringPart(tag.exp);
      if (propsExp) {
        context.pushStringPart(propsExp);
      }
      if (scopeId) {
        context.pushStringPart(` ${scopeId}`);
      }
      context.pushStringPart(`>`);
      processChildren(
        node,
        context,
        false,
        /**
         * TransitionGroup has the special runtime behavior of flattening and
         * concatenating all children into a single fragment (in order for them to
         * be patched using the same key map) so we need to account for that here
         * by disabling nested fragment wrappers from being generated.
         */
        true,
        /**
         * TransitionGroup filters out comment children at runtime and thus
         * doesn't expect comments to be present during hydration. We need to
         * account for that by disabling the empty comment that is otherwise
         * rendered for a falsy v-if that has no v-else specified. (#6715)
         */
        true
      );
      context.pushStringPart(`</`);
      context.pushStringPart(tag.exp);
      context.pushStringPart(`>`);
    } else {
      context.pushStringPart(`<${tag.value.content}`);
      if (propsExp) {
        context.pushStringPart(propsExp);
      }
      if (scopeId) {
        context.pushStringPart(` ${scopeId}`);
      }
      context.pushStringPart(`>`);
      processChildren(node, context, false, true, true);
      context.pushStringPart(`</${tag.value.content}>`);
    }
  } else {
    processChildren(node, context, true, true, true);
  }
}

const wipMap$1 = /* @__PURE__ */ new WeakMap();
function ssrTransformTransition(node, context) {
  return () => {
    const appear = compilerDom.findProp(node, "appear", false, true);
    wipMap$1.set(node, !!appear);
  };
}
function ssrProcessTransition(node, context) {
  node.children = node.children.filter((c) => c.type !== 3);
  const appear = wipMap$1.get(node);
  if (appear) {
    context.pushStringPart(`<template>`);
    processChildren(node, context, false, true);
    context.pushStringPart(`</template>`);
  } else {
    processChildren(node, context, false, true);
  }
}

const wipMap = /* @__PURE__ */ new WeakMap();
const WIP_SLOT = /* @__PURE__ */ Symbol();
const componentTypeMap = /* @__PURE__ */ new WeakMap();
const ssrTransformComponent = (node, context) => {
  if (node.type !== 1 || node.tagType !== 1) {
    return;
  }
  const component = compilerDom.resolveComponentType(
    node,
    context,
    true
    /* ssr */
  );
  const isDynamicComponent = shared.isObject(component) && component.callee === compilerDom.RESOLVE_DYNAMIC_COMPONENT;
  componentTypeMap.set(node, component);
  if (shared.isSymbol(component)) {
    if (component === compilerDom.SUSPENSE) {
      return ssrTransformSuspense(node, context);
    } else if (component === compilerDom.TRANSITION_GROUP) {
      return ssrTransformTransitionGroup(node, context);
    } else if (component === compilerDom.TRANSITION) {
      return ssrTransformTransition(node);
    }
    return;
  }
  const vnodeBranches = [];
  const clonedNode = clone(node);
  return function ssrPostTransformComponent() {
    if (clonedNode.children.length) {
      compilerDom.buildSlots(clonedNode, context, (props, vFor, children) => {
        vnodeBranches.push(
          createVNodeSlotBranch(props, vFor, children, context)
        );
        return compilerDom.createFunctionExpression(void 0);
      });
    }
    let propsExp = `null`;
    if (node.props.length) {
      const { props, directives } = compilerDom.buildProps(
        node,
        context,
        void 0,
        true,
        isDynamicComponent
      );
      if (props || directives.length) {
        propsExp = buildSSRProps(props, directives, context);
      }
    }
    const wipEntries = [];
    wipMap.set(node, wipEntries);
    const buildSSRSlotFn = (props, _vForExp, children, loc) => {
      const param0 = props && compilerDom.stringifyExpression(props) || `_`;
      const fn = compilerDom.createFunctionExpression(
        [param0, `_push`, `_parent`, `_scopeId`],
        void 0,
        // no return, assign body later
        true,
        // newline
        true,
        // isSlot
        loc
      );
      wipEntries.push({
        type: WIP_SLOT,
        fn,
        children,
        // also collect the corresponding vnode branch built earlier
        vnodeBranch: vnodeBranches[wipEntries.length]
      });
      return fn;
    };
    const slots = node.children.length ? compilerDom.buildSlots(node, context, buildSSRSlotFn).slots : `null`;
    if (typeof component !== "string") {
      node.ssrCodegenNode = compilerDom.createCallExpression(
        context.helper(SSR_RENDER_VNODE),
        [
          `_push`,
          compilerDom.createCallExpression(context.helper(compilerDom.CREATE_VNODE), [
            component,
            propsExp,
            slots
          ]),
          `_parent`
        ]
      );
    } else {
      node.ssrCodegenNode = compilerDom.createCallExpression(
        context.helper(SSR_RENDER_COMPONENT),
        [component, propsExp, slots, `_parent`]
      );
    }
  };
};
function ssrProcessComponent(node, context, parent) {
  const component = componentTypeMap.get(node);
  if (!node.ssrCodegenNode) {
    if (component === compilerDom.TELEPORT) {
      return ssrProcessTeleport(node, context);
    } else if (component === compilerDom.SUSPENSE) {
      return ssrProcessSuspense(node, context);
    } else if (component === compilerDom.TRANSITION_GROUP) {
      return ssrProcessTransitionGroup(node, context);
    } else {
      if (parent.type === WIP_SLOT) {
        context.pushStringPart(``);
      }
      if (component === compilerDom.TRANSITION) {
        return ssrProcessTransition(node, context);
      }
      processChildren(node, context);
    }
  } else {
    const wipEntries = wipMap.get(node) || [];
    for (let i = 0; i < wipEntries.length; i++) {
      const { fn, vnodeBranch } = wipEntries[i];
      fn.body = compilerDom.createIfStatement(
        compilerDom.createSimpleExpression(`_push`, false),
        processChildrenAsStatement(
          wipEntries[i],
          context,
          false,
          true
        ),
        vnodeBranch
      );
    }
    if (context.withSlotScopeId) {
      node.ssrCodegenNode.arguments.push(`_scopeId`);
    }
    if (typeof component === "string") {
      context.pushStatement(
        compilerDom.createCallExpression(`_push`, [node.ssrCodegenNode])
      );
    } else {
      context.pushStatement(node.ssrCodegenNode);
    }
  }
}
const rawOptionsMap = /* @__PURE__ */ new WeakMap();
const [baseNodeTransforms, baseDirectiveTransforms] = compilerDom.getBaseTransformPreset(true);
const vnodeNodeTransforms = [...baseNodeTransforms, ...compilerDom.DOMNodeTransforms];
const vnodeDirectiveTransforms = {
  ...baseDirectiveTransforms,
  ...compilerDom.DOMDirectiveTransforms
};
function createVNodeSlotBranch(slotProps, vFor, children, parentContext) {
  const rawOptions = rawOptionsMap.get(parentContext.root);
  const subOptions = {
    ...rawOptions,
    // overwrite with vnode-based transforms
    nodeTransforms: [
      ...vnodeNodeTransforms,
      ...rawOptions.nodeTransforms || []
    ],
    directiveTransforms: {
      ...vnodeDirectiveTransforms,
      ...rawOptions.directiveTransforms || {}
    }
  };
  const wrapperProps = [];
  if (slotProps) {
    wrapperProps.push({
      type: 7,
      name: "slot",
      exp: slotProps,
      arg: void 0,
      modifiers: [],
      loc: compilerDom.locStub
    });
  }
  if (vFor) {
    wrapperProps.push(shared.extend({}, vFor));
  }
  const wrapperNode = {
    type: 1,
    ns: 0,
    tag: "template",
    tagType: 3,
    props: wrapperProps,
    children,
    loc: compilerDom.locStub,
    codegenNode: void 0
  };
  subTransform(wrapperNode, subOptions, parentContext);
  return compilerDom.createReturnStatement(children);
}
function subTransform(node, options, parentContext) {
  const childRoot = compilerDom.createRoot([node]);
  const childContext = compilerDom.createTransformContext(childRoot, options);
  childContext.ssr = false;
  childContext.scopes = { ...parentContext.scopes };
  childContext.identifiers = { ...parentContext.identifiers };
  childContext.imports = parentContext.imports;
  compilerDom.traverseNode(childRoot, childContext);
  ["helpers", "components", "directives"].forEach((key) => {
    childContext[key].forEach((value, helperKey) => {
      if (key === "helpers") {
        const parentCount = parentContext.helpers.get(helperKey);
        if (parentCount === void 0) {
          parentContext.helpers.set(helperKey, value);
        } else {
          parentContext.helpers.set(helperKey, value + parentCount);
        }
      } else {
        parentContext[key].add(value);
      }
    });
  });
}
function clone(v) {
  if (shared.isArray(v)) {
    return v.map(clone);
  } else if (shared.isPlainObject(v)) {
    const res = {};
    for (const key in v) {
      res[key] = clone(v[key]);
    }
    return res;
  } else {
    return v;
  }
}

function ssrCodegenTransform(ast, options) {
  const context = createSSRTransformContext(ast, options);
  if (options.ssrCssVars) {
    const cssContext = compilerDom.createTransformContext(compilerDom.createRoot([]), options);
    const varsExp = compilerDom.processExpression(
      compilerDom.createSimpleExpression(options.ssrCssVars, false),
      cssContext
    );
    context.body.push(
      compilerDom.createCompoundExpression([`const _cssVars = { style: `, varsExp, `}`])
    );
    Array.from(cssContext.helpers.keys()).forEach((helper) => {
      ast.helpers.add(helper);
    });
  }
  const isFragment = ast.children.length > 1 && ast.children.some((c) => !compilerDom.isText(c));
  processChildren(ast, context, isFragment);
  ast.codegenNode = compilerDom.createBlockStatement(context.body);
  ast.ssrHelpers = Array.from(
    /* @__PURE__ */ new Set([
      ...Array.from(ast.helpers).filter((h) => h in ssrHelpers),
      ...context.helpers
    ])
  );
  ast.helpers = new Set(Array.from(ast.helpers).filter((h) => !(h in ssrHelpers)));
}
function createSSRTransformContext(root, options, helpers = /* @__PURE__ */ new Set(), withSlotScopeId = false) {
  const body = [];
  let currentString = null;
  return {
    root,
    options,
    body,
    helpers,
    withSlotScopeId,
    onError: options.onError || ((e) => {
      throw e;
    }),
    helper(name) {
      helpers.add(name);
      return name;
    },
    pushStringPart(part) {
      if (!currentString) {
        const currentCall = compilerDom.createCallExpression(`_push`);
        body.push(currentCall);
        currentString = compilerDom.createTemplateLiteral([]);
        currentCall.arguments.push(currentString);
      }
      const bufferedElements = currentString.elements;
      const lastItem = bufferedElements[bufferedElements.length - 1];
      if (shared.isString(part) && shared.isString(lastItem)) {
        bufferedElements[bufferedElements.length - 1] += part;
      } else {
        bufferedElements.push(part);
      }
    },
    pushStatement(statement) {
      currentString = null;
      body.push(statement);
    }
  };
}
function createChildContext(parent, withSlotScopeId = parent.withSlotScopeId) {
  return createSSRTransformContext(
    parent.root,
    parent.options,
    parent.helpers,
    withSlotScopeId
  );
}
function processChildren(parent, context, asFragment = false, disableNestedFragments = false, disableComment = false) {
  if (asFragment) {
    context.pushStringPart(`<!--[-->`);
  }
  const { children } = parent;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    switch (child.type) {
      case 1:
        switch (child.tagType) {
          case 0:
            ssrProcessElement(child, context);
            break;
          case 1:
            ssrProcessComponent(child, context, parent);
            break;
          case 2:
            ssrProcessSlotOutlet(child, context);
            break;
          case 3:
            break;
          default:
            context.onError(
              createSSRCompilerError(
                67,
                child.loc
              )
            );
            const exhaustiveCheck2 = child;
            return exhaustiveCheck2;
        }
        break;
      case 2:
        context.pushStringPart(shared.escapeHtml(child.content));
        break;
      case 3:
        if (!disableComment) {
          context.pushStringPart(`<!--${child.content}-->`);
        }
        break;
      case 5:
        context.pushStringPart(
          compilerDom.createCallExpression(context.helper(SSR_INTERPOLATE), [
            child.content
          ])
        );
        break;
      case 9:
        ssrProcessIf(child, context, disableNestedFragments, disableComment);
        break;
      case 11:
        ssrProcessFor(child, context, disableNestedFragments);
        break;
      case 10:
        break;
      case 12:
      case 8:
        break;
      default:
        context.onError(
          createSSRCompilerError(
            67,
            child.loc
          )
        );
        const exhaustiveCheck = child;
        return exhaustiveCheck;
    }
  }
  if (asFragment) {
    context.pushStringPart(`<!--]-->`);
  }
}
function processChildrenAsStatement(parent, parentContext, asFragment = false, withSlotScopeId = parentContext.withSlotScopeId) {
  const childContext = createChildContext(parentContext, withSlotScopeId);
  processChildren(parent, childContext, asFragment);
  return compilerDom.createBlockStatement(childContext.body);
}

const ssrTransformModel = (dir, node, context) => {
  const model = dir.exp;
  function checkDuplicatedValue() {
    const value = compilerDom.findProp(node, "value");
    if (value) {
      context.onError(
        compilerDom.createDOMCompilerError(
          61,
          value.loc
        )
      );
    }
  }
  const processSelectChildren = (children) => {
    children.forEach((child) => {
      if (child.type === 1) {
        processOption(child);
      } else if (child.type === 11) {
        processSelectChildren(child.children);
      } else if (child.type === 9) {
        child.branches.forEach((b) => processSelectChildren(b.children));
      }
    });
  };
  function processOption(plainNode) {
    if (plainNode.tag === "option") {
      if (plainNode.props.findIndex((p) => p.name === "selected") === -1) {
        const value = findValueBinding(plainNode);
        plainNode.ssrCodegenNode.elements.push(
          compilerDom.createConditionalExpression(
            compilerDom.createCallExpression(context.helper(SSR_INCLUDE_BOOLEAN_ATTR), [
              compilerDom.createConditionalExpression(
                compilerDom.createCallExpression(`Array.isArray`, [model]),
                compilerDom.createCallExpression(context.helper(SSR_LOOSE_CONTAIN), [
                  model,
                  value
                ]),
                compilerDom.createCallExpression(context.helper(SSR_LOOSE_EQUAL), [
                  model,
                  value
                ])
              )
            ]),
            compilerDom.createSimpleExpression(" selected", true),
            compilerDom.createSimpleExpression("", true),
            false
          )
        );
      }
    } else if (plainNode.tag === "optgroup") {
      processSelectChildren(plainNode.children);
    }
  }
  if (node.tagType === 0) {
    const res = { props: [] };
    if (node.tag === "input") {
      const defaultProps = [
        // default value binding for text type inputs
        compilerDom.createObjectProperty(`value`, model)
      ];
      const type = compilerDom.findProp(node, "type");
      if (type) {
        const value = findValueBinding(node);
        if (type.type === 7) {
          res.ssrTagParts = [
            compilerDom.createCallExpression(context.helper(SSR_RENDER_DYNAMIC_MODEL), [
              type.exp,
              model,
              value
            ])
          ];
        } else if (type.value) {
          switch (type.value.content) {
            case "radio":
              res.props = [
                compilerDom.createObjectProperty(
                  `checked`,
                  compilerDom.createCallExpression(context.helper(SSR_LOOSE_EQUAL), [
                    model,
                    value
                  ])
                )
              ];
              break;
            case "checkbox":
              const trueValueBinding = compilerDom.findProp(node, "true-value");
              if (trueValueBinding) {
                const trueValue = trueValueBinding.type === 6 ? JSON.stringify(trueValueBinding.value.content) : trueValueBinding.exp;
                res.props = [
                  compilerDom.createObjectProperty(
                    `checked`,
                    compilerDom.createCallExpression(context.helper(SSR_LOOSE_EQUAL), [
                      model,
                      trueValue
                    ])
                  )
                ];
              } else {
                res.props = [
                  compilerDom.createObjectProperty(
                    `checked`,
                    compilerDom.createConditionalExpression(
                      compilerDom.createCallExpression(`Array.isArray`, [model]),
                      compilerDom.createCallExpression(context.helper(SSR_LOOSE_CONTAIN), [
                        model,
                        value
                      ]),
                      model
                    )
                  )
                ];
              }
              break;
            case "file":
              context.onError(
                compilerDom.createDOMCompilerError(
                  60,
                  dir.loc
                )
              );
              break;
            default:
              checkDuplicatedValue();
              res.props = defaultProps;
              break;
          }
        }
      } else if (compilerDom.hasDynamicKeyVBind(node)) ; else {
        checkDuplicatedValue();
        res.props = defaultProps;
      }
    } else if (node.tag === "textarea") {
      checkDuplicatedValue();
      node.children = [compilerDom.createInterpolation(model, model.loc)];
    } else if (node.tag === "select") {
      processSelectChildren(node.children);
    } else {
      context.onError(
        compilerDom.createDOMCompilerError(
          58,
          dir.loc
        )
      );
    }
    return res;
  } else {
    return compilerDom.transformModel(dir, node, context);
  }
};
function findValueBinding(node) {
  const valueBinding = compilerDom.findProp(node, "value");
  return valueBinding ? valueBinding.type === 7 ? valueBinding.exp : compilerDom.createSimpleExpression(valueBinding.value.content, true) : compilerDom.createSimpleExpression(`null`, false);
}

const ssrTransformShow = (dir, node, context) => {
  if (!dir.exp) {
    context.onError(
      compilerDom.createDOMCompilerError(62)
    );
  }
  return {
    props: [
      compilerDom.createObjectProperty(
        `style`,
        compilerDom.createConditionalExpression(
          dir.exp,
          compilerDom.createSimpleExpression(`null`, false),
          compilerDom.createObjectExpression([
            compilerDom.createObjectProperty(
              `display`,
              compilerDom.createSimpleExpression(`none`, true)
            )
          ]),
          false
        )
      )
    ]
  };
};

const filterChild = (node) => node.children.filter((n) => !compilerDom.isCommentOrWhitespace(n));
const hasSingleChild = (node) => filterChild(node).length === 1;
const ssrInjectFallthroughAttrs = (node, context) => {
  if (node.type === 0) {
    context.identifiers._attrs = 1;
  }
  if (node.type === 1 && node.tagType === 1 && (node.tag === "transition" || node.tag === "Transition" || node.tag === "KeepAlive" || node.tag === "keep-alive")) {
    const rootChildren = filterChild(context.root);
    if (rootChildren.length === 1 && rootChildren[0] === node) {
      if (hasSingleChild(node)) {
        injectFallthroughAttrs(node.children[0]);
      }
      return;
    }
  }
  const parent = context.parent;
  if (!parent || parent.type !== 0) {
    return;
  }
  if (node.type === 10 && hasSingleChild(node)) {
    let hasEncounteredIf = false;
    for (const c of filterChild(parent)) {
      if (c.type === 9 || c.type === 1 && compilerDom.findDir(c, "if")) {
        if (hasEncounteredIf) return;
        hasEncounteredIf = true;
      } else if (
        // node before v-if
        !hasEncounteredIf || // non else nodes
        !(c.type === 1 && compilerDom.findDir(c, /else/, true))
      ) {
        return;
      }
    }
    injectFallthroughAttrs(node.children[0]);
  } else if (hasSingleChild(parent)) {
    injectFallthroughAttrs(node);
  }
};
function injectFallthroughAttrs(node) {
  if (node.type === 1 && (node.tagType === 0 || node.tagType === 1) && !compilerDom.findDir(node, "for")) {
    node.props.push({
      type: 7,
      name: "bind",
      arg: void 0,
      exp: compilerDom.createSimpleExpression(`_attrs`, false),
      modifiers: [],
      loc: compilerDom.locStub
    });
  }
}

const ssrInjectCssVars = (node, context) => {
  if (!context.ssrCssVars) {
    return;
  }
  if (node.type === 0) {
    context.identifiers._cssVars = 1;
  }
  const parent = context.parent;
  if (!parent || parent.type !== 0) {
    return;
  }
  if (node.type === 10) {
    for (const child of node.children) {
      injectCssVars(child);
    }
  } else {
    injectCssVars(node);
  }
};
function injectCssVars(node) {
  if (node.type === 1 && (node.tagType === 0 || node.tagType === 1) && !compilerDom.findDir(node, "for")) {
    if (node.tag === "suspense" || node.tag === "Suspense") {
      for (const child of node.children) {
        if (child.type === 1 && child.tagType === 3) {
          child.children.forEach(injectCssVars);
        } else {
          injectCssVars(child);
        }
      }
    } else {
      node.props.push({
        type: 7,
        name: "bind",
        arg: void 0,
        exp: compilerDom.createSimpleExpression(`_cssVars`, false),
        modifiers: [],
        loc: compilerDom.locStub
      });
    }
  }
}

function compile(source, options = {}) {
  options = {
    ...options,
    ...compilerDom.parserOptions,
    ssr: true,
    inSSR: true,
    scopeId: options.mode === "function" ? null : options.scopeId,
    // always prefix since compiler-ssr doesn't have size concern
    prefixIdentifiers: true,
    // disable optimizations that are unnecessary for ssr
    cacheHandlers: false,
    hoistStatic: false
  };
  const ast = typeof source === "string" ? compilerDom.baseParse(source, options) : source;
  rawOptionsMap.set(ast, options);
  compilerDom.transform(ast, {
    ...options,
    hoistStatic: false,
    nodeTransforms: [
      compilerDom.transformVBindShorthand,
      ssrTransformIf,
      ssrTransformFor,
      compilerDom.trackVForSlotScopes,
      compilerDom.transformExpression,
      ssrTransformSlotOutlet,
      ssrInjectFallthroughAttrs,
      ssrInjectCssVars,
      ssrTransformElement,
      ssrTransformComponent,
      compilerDom.trackSlotScopes,
      compilerDom.transformStyle,
      ...options.nodeTransforms || []
      // user transforms
    ],
    directiveTransforms: {
      // reusing core v-bind
      bind: compilerDom.transformBind,
      on: compilerDom.transformOn,
      // model and show have dedicated SSR handling
      model: ssrTransformModel,
      show: ssrTransformShow,
      // the following are ignored during SSR
      // on: noopDirectiveTransform,
      cloak: compilerDom.noopDirectiveTransform,
      once: compilerDom.noopDirectiveTransform,
      memo: compilerDom.noopDirectiveTransform,
      ...options.directiveTransforms || {}
      // user transforms
    }
  });
  ssrCodegenTransform(ast, options);
  return compilerDom.generate(ast, options);
}

exports.compile = compile;
