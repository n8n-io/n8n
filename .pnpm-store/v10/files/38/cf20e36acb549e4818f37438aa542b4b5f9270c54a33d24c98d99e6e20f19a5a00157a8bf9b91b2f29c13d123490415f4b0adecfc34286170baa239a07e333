// src/DocsRenderer.tsx
import React, { Component } from "react";
import { renderElement, unmountElement } from "@storybook/react-dom-shim";
import { AnchorMdx, CodeOrSourceMdx, Docs, HeadersMdx } from "@storybook/addon-docs/blocks";
var defaultComponents = {
  code: CodeOrSourceMdx,
  a: AnchorMdx,
  ...HeadersMdx
}, ErrorBoundary = class extends Component {
  constructor() {
    super(...arguments);
    this.state = { hasError: !1 };
  }
  static getDerivedStateFromError() {
    return { hasError: !0 };
  }
  componentDidCatch(err) {
    let { showException } = this.props;
    showException(err);
  }
  render() {
    let { hasError } = this.state, { children } = this.props;
    return hasError ? null : React.createElement(React.Fragment, null, children);
  }
}, DocsRenderer = class {
  constructor() {
    this.render = async (context, docsParameter, element) => {
      let components = {
        ...defaultComponents,
        ...docsParameter?.components
      }, TDocs = Docs;
      return new Promise((resolve, reject) => {
        import("@mdx-js/react").then(
          ({ MDXProvider }) => (
            // We use a `key={}` here to reset the `hasError` state each time we render ErrorBoundary
            renderElement(
              React.createElement(ErrorBoundary, { showException: reject, key: Math.random() }, React.createElement(MDXProvider, { components }, React.createElement(TDocs, { context, docsParameter }))),
              element
            )
          )
        ).then(() => resolve());
      });
    }, this.unmount = (element) => {
      unmountElement(element);
    };
  }
};

export {
  defaultComponents,
  DocsRenderer
};
