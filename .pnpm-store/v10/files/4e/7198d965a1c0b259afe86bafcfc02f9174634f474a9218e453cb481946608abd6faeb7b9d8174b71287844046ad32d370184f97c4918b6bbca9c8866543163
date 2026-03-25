import {
  ActionBar,
  ScrollArea,
  createCopyToClipboardFunction
} from "../_browser-chunks/chunk-P4F4UVXX.js";
import {
  _objectWithoutPropertiesLoose
} from "../_browser-chunks/chunk-45UGUKRX.js";
import {
  curriedDarken$1,
  curriedLighten$1,
  curriedTransparentize$1,
  rgba
} from "../_browser-chunks/chunk-AXG2BOBL.js";
import {
  _extends
} from "../_browser-chunks/chunk-CHUV5WSW.js";
import {
  isTestEnvironment
} from "../_browser-chunks/chunk-IPA5A322.js";
import {
  require_memoizerific
} from "../_browser-chunks/chunk-WJYERY3R.js";
import {
  __export,
  __toESM
} from "../_browser-chunks/chunk-A242L54C.js";

// src/components/index.ts
import { createElement as createElement2, forwardRef as forwardRef18 } from "react";

// src/components/components/typography/components.tsx
import React4 from "react";

// src/components/components/typography/DocumentFormatting.tsx
var nameSpaceClassNames = ({ ...props }, key) => {
  let classes = [props.class, props.className];
  return delete props.class, props.className = ["sbdocs", `sbdocs-${key}`, ...classes].filter(Boolean).join(" "), props;
};

// src/components/components/typography/ResetWrapper.tsx
import { styled } from "storybook/theming";

// src/components/components/typography/lib/common.tsx
var headerCommon = ({ theme }) => ({
  margin: "20px 0 8px",
  padding: 0,
  cursor: "text",
  position: "relative",
  color: theme.color.defaultText,
  "&:first-of-type": {
    marginTop: 0,
    paddingTop: 0
  },
  "&:hover a.anchor": {
    textDecoration: "none"
  },
  "& tt, & code": {
    fontSize: "inherit"
  }
}), codeCommon = ({ theme }) => ({
  lineHeight: 1,
  margin: "0 2px",
  padding: "3px 5px",
  whiteSpace: "nowrap",
  borderRadius: 3,
  fontSize: theme.typography.size.s2 - 1,
  border: theme.base === "light" ? "1px solid hsl(0 0 0 / 0.05)" : "1px solid hsl(0 0 100 / 0.05)",
  color: theme.color.defaultText,
  backgroundColor: theme.base === "light" ? "hsl(0 0 0 / 0.01)" : "hsl(0 0 100 / 0.02)"
}), withReset = ({ theme }) => ({
  fontFamily: theme.typography.fonts.base,
  fontSize: theme.typography.size.s3,
  margin: 0,
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
  WebkitTapHighlightColor: "rgba(0, 0, 0, 0)",
  WebkitOverflowScrolling: "touch"
}), withMargin = {
  margin: "16px 0"
};

// src/components/components/typography/ResetWrapper.tsx
var ResetWrapper = styled.div(withReset);

// src/components/components/typography/elements/A.tsx
import { styled as styled2 } from "storybook/theming";

// src/components/components/typography/elements/Link.tsx
import React from "react";
var Link = ({
  href: input = "",
  ...props
}) => {
  let href = /^\//.test(input) ? `./?path=${input}` : input, target = /^#.*/.test(input) ? "_self" : "_top";
  return React.createElement("a", { href, target, ...props });
};

// src/components/components/typography/elements/A.tsx
var A = styled2(Link)(withReset, ({ theme }) => ({
  fontSize: "inherit",
  lineHeight: "24px",
  color: theme.color.secondary,
  textDecoration: "none",
  "&.absent": {
    color: "#cc0000"
  },
  "&.anchor": {
    display: "block",
    paddingLeft: 30,
    marginLeft: -30,
    cursor: "pointer",
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0
  }
}));

// src/components/components/typography/elements/Blockquote.tsx
import { styled as styled3 } from "storybook/theming";
var Blockquote = styled3.blockquote(withReset, withMargin, ({ theme }) => ({
  borderLeft: `4px solid ${theme.color.medium}`,
  padding: "0 15px",
  color: theme.color.dark,
  "& > :first-of-type": {
    marginTop: 0
  },
  "& > :last-child": {
    marginBottom: 0
  }
}));

// src/components/components/typography/elements/Code.tsx
import React3, { Children } from "react";
import { styled as styled4 } from "storybook/theming";

// src/components/components/syntaxhighlighter/lazy-syntaxhighlighter.tsx
import React2, { Suspense, lazy } from "react";
var languages = [], Comp = null, LazySyntaxHighlighter = lazy(async () => {
  let { SyntaxHighlighter: SyntaxHighlighter2 } = await import("../_browser-chunks/syntaxhighlighter-IQDEPFLK.js");
  return languages.length > 0 && (languages.forEach((args) => {
    SyntaxHighlighter2.registerLanguage(...args);
  }), languages = []), Comp === null && (Comp = SyntaxHighlighter2), {
    default: (props) => React2.createElement(SyntaxHighlighter2, { ...props })
  };
}), LazySyntaxHighlighterWithFormatter = lazy(async () => {
  let [{ SyntaxHighlighter: SyntaxHighlighter2 }, { formatter }] = await Promise.all([
    import("../_browser-chunks/syntaxhighlighter-IQDEPFLK.js"),
    import("../_browser-chunks/formatter-QJ4M4OGQ.js")
  ]);
  return languages.length > 0 && (languages.forEach((args) => {
    SyntaxHighlighter2.registerLanguage(...args);
  }), languages = []), Comp === null && (Comp = SyntaxHighlighter2), {
    default: (props) => React2.createElement(SyntaxHighlighter2, { ...props, formatter })
  };
}), SyntaxHighlighter = (props) => React2.createElement(Suspense, { fallback: React2.createElement("div", null) }, props.format !== !1 ? React2.createElement(LazySyntaxHighlighterWithFormatter, { ...props }) : React2.createElement(LazySyntaxHighlighter, { ...props }));
SyntaxHighlighter.registerLanguage = (...args) => {
  if (Comp !== null) {
    Comp.registerLanguage(...args);
    return;
  }
  languages.push(args);
};

// src/components/components/typography/lib/isReactChildString.tsx
var isReactChildString = (child) => typeof child == "string";

// src/components/components/typography/elements/Code.tsx
var isInlineCodeRegex = /[\n\r]/g, DefaultCodeBlock = styled4.code(
  ({ theme }) => ({
    // from reset
    fontFamily: theme.typography.fonts.mono,
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    display: "inline-block",
    paddingLeft: 2,
    paddingRight: 2,
    verticalAlign: "baseline",
    color: "inherit"
  }),
  codeCommon
), StyledSyntaxHighlighter = styled4(SyntaxHighlighter)(({ theme }) => ({
  // DocBlocks-specific styling and overrides
  fontFamily: theme.typography.fonts.mono,
  fontSize: `${theme.typography.size.s2 - 1}px`,
  lineHeight: "19px",
  margin: "25px 0 40px",
  borderRadius: theme.appBorderRadius,
  boxShadow: theme.base === "light" ? "rgba(0, 0, 0, 0.10) 0 1px 3px 0" : "rgba(0, 0, 0, 0.20) 0 2px 5px 0",
  "pre.prismjs": {
    padding: 20,
    background: "inherit"
  }
})), Code = ({
  className,
  children,
  ...props
}) => {
  let language = (className || "").match(/lang-(\S+)/), childrenArray = Children.toArray(children);
  return childrenArray.filter(isReactChildString).some((child) => child.match(isInlineCodeRegex)) ? React3.createElement(
    StyledSyntaxHighlighter,
    {
      bordered: !0,
      copyable: !0,
      language: language?.[1] ?? "text",
      format: !1,
      ...props
    },
    children
  ) : React3.createElement(DefaultCodeBlock, { ...props, className }, childrenArray);
};

// src/components/components/typography/elements/DL.tsx
import { styled as styled5 } from "storybook/theming";
var DL = styled5.dl(withReset, withMargin, {
  padding: 0,
  "& dt": {
    fontSize: "14px",
    fontWeight: "bold",
    fontStyle: "italic",
    padding: 0,
    margin: "16px 0 4px"
  },
  "& dt:first-of-type": {
    padding: 0
  },
  "& dt > :first-of-type": {
    marginTop: 0
  },
  "& dt > :last-child": {
    marginBottom: 0
  },
  "& dd": {
    margin: "0 0 16px",
    padding: "0 15px"
  },
  "& dd > :first-of-type": {
    marginTop: 0
  },
  "& dd > :last-child": {
    marginBottom: 0
  }
});

// src/components/components/typography/elements/Div.tsx
import { styled as styled6 } from "storybook/theming";
var Div = styled6.div(withReset);

// src/components/components/typography/elements/H1.tsx
import { styled as styled7 } from "storybook/theming";
var H1 = styled7.h1(withReset, headerCommon, ({ theme }) => ({
  fontSize: `${theme.typography.size.l1}px`,
  fontWeight: theme.typography.weight.bold
}));

// src/components/components/typography/elements/H2.tsx
import { styled as styled8 } from "storybook/theming";
var H2 = styled8.h2(withReset, headerCommon, ({ theme }) => ({
  fontSize: `${theme.typography.size.m2}px`,
  paddingBottom: 4,
  borderBottom: `1px solid ${theme.appBorderColor}`
}));

// src/components/components/typography/elements/H3.tsx
import { styled as styled9 } from "storybook/theming";
var H3 = styled9.h3(withReset, headerCommon, ({ theme }) => ({
  fontSize: `${theme.typography.size.m1}px`
}));

// src/components/components/typography/elements/H4.tsx
import { styled as styled10 } from "storybook/theming";
var H4 = styled10.h4(withReset, headerCommon, ({ theme }) => ({
  fontSize: `${theme.typography.size.s3}px`
}));

// src/components/components/typography/elements/H5.tsx
import { styled as styled11 } from "storybook/theming";
var H5 = styled11.h5(withReset, headerCommon, ({ theme }) => ({
  fontSize: `${theme.typography.size.s2}px`
}));

// src/components/components/typography/elements/H6.tsx
import { styled as styled12 } from "storybook/theming";
var H6 = styled12.h6(withReset, headerCommon, ({ theme }) => ({
  fontSize: `${theme.typography.size.s2}px`,
  color: theme.color.dark
}));

// src/components/components/typography/elements/HR.tsx
import { styled as styled13 } from "storybook/theming";
var HR = styled13.hr(({ theme }) => ({
  border: "0 none",
  borderTop: `1px solid ${theme.appBorderColor}`,
  height: 4,
  padding: 0
}));

// src/components/components/typography/elements/Img.tsx
import { styled as styled14 } from "storybook/theming";
var Img = styled14.img({
  maxWidth: "100%"
});

// src/components/components/typography/elements/LI.tsx
import { styled as styled15 } from "storybook/theming";
var LI = styled15.li(withReset, ({ theme }) => ({
  fontSize: theme.typography.size.s2,
  color: theme.color.defaultText,
  lineHeight: "24px",
  "& + li": {
    marginTop: ".25em"
  },
  "& ul, & ol": {
    marginTop: ".25em",
    marginBottom: 0
  },
  "& code": codeCommon({ theme })
}));

// src/components/components/typography/elements/OL.tsx
import { styled as styled16 } from "storybook/theming";
var listCommon = {
  paddingLeft: 30,
  "& :first-of-type": {
    marginTop: 0
  },
  "& :last-child": {
    marginBottom: 0
  }
}, OL = styled16.ol(withReset, withMargin, listCommon, {
  listStyle: "decimal"
});

// src/components/components/typography/elements/P.tsx
import { styled as styled17 } from "storybook/theming";
var P = styled17.p(withReset, withMargin, ({ theme }) => ({
  fontSize: theme.typography.size.s2,
  lineHeight: "24px",
  color: theme.color.defaultText,
  "& code": codeCommon({ theme })
}));

// src/components/components/typography/elements/Pre.tsx
import { styled as styled18 } from "storybook/theming";
var Pre = styled18.pre(withReset, withMargin, ({ theme }) => ({
  // reset
  fontFamily: theme.typography.fonts.mono,
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
  lineHeight: "18px",
  padding: "11px 1rem",
  whiteSpace: "pre-wrap",
  color: "inherit",
  borderRadius: 3,
  margin: "1rem 0",
  "&:not(.prismjs)": {
    background: "transparent",
    border: "none",
    borderRadius: 0,
    padding: 0,
    margin: 0
  },
  "& pre, &.prismjs": {
    padding: 15,
    margin: 0,
    whiteSpace: "pre-wrap",
    color: "inherit",
    fontSize: "13px",
    lineHeight: "19px",
    code: {
      color: "inherit",
      fontSize: "inherit"
    }
  },
  "& code": {
    whiteSpace: "pre"
  },
  "& code, & tt": {
    border: "none"
  }
}));

// src/components/components/typography/elements/Span.tsx
import { styled as styled19 } from "storybook/theming";
var Span = styled19.span(withReset, ({ theme }) => ({
  "&.frame": {
    display: "block",
    overflow: "hidden",
    "& > span": {
      border: `1px solid ${theme.color.medium}`,
      display: "block",
      float: "left",
      overflow: "hidden",
      margin: "13px 0 0",
      padding: 7,
      width: "auto"
    },
    "& span img": {
      display: "block",
      float: "left"
    },
    "& span span": {
      clear: "both",
      color: theme.color.darkest,
      display: "block",
      padding: "5px 0 0"
    }
  },
  "&.align-center": {
    display: "block",
    overflow: "hidden",
    clear: "both",
    "& > span": {
      display: "block",
      overflow: "hidden",
      margin: "13px auto 0",
      textAlign: "center"
    },
    "& span img": {
      margin: "0 auto",
      textAlign: "center"
    }
  },
  "&.align-right": {
    display: "block",
    overflow: "hidden",
    clear: "both",
    "& > span": {
      display: "block",
      overflow: "hidden",
      margin: "13px 0 0",
      textAlign: "right"
    },
    "& span img": {
      margin: 0,
      textAlign: "right"
    }
  },
  "&.float-left": {
    display: "block",
    marginRight: 13,
    overflow: "hidden",
    float: "left",
    "& span": {
      margin: "13px 0 0"
    }
  },
  "&.float-right": {
    display: "block",
    marginLeft: 13,
    overflow: "hidden",
    float: "right",
    "& > span": {
      display: "block",
      overflow: "hidden",
      margin: "13px auto 0",
      textAlign: "right"
    }
  }
}));

// src/components/components/typography/elements/TT.tsx
import { styled as styled20 } from "storybook/theming";
var TT = styled20.title(codeCommon);

// src/components/components/typography/elements/Table.tsx
import { styled as styled21 } from "storybook/theming";
var Table = styled21.table(withReset, withMargin, ({ theme }) => ({
  fontSize: theme.typography.size.s2,
  lineHeight: "24px",
  padding: 0,
  borderCollapse: "collapse",
  "& tr": {
    borderTop: `1px solid ${theme.appBorderColor}`,
    backgroundColor: theme.appContentBg,
    margin: 0,
    padding: 0
  },
  "& tr:nth-of-type(2n)": {
    backgroundColor: theme.base === "dark" ? theme.color.darker : theme.color.lighter
  },
  "& tr th": {
    fontWeight: "bold",
    color: theme.color.defaultText,
    border: `1px solid ${theme.appBorderColor}`,
    margin: 0,
    padding: "6px 13px"
  },
  "& tr td": {
    border: `1px solid ${theme.appBorderColor}`,
    color: theme.color.defaultText,
    margin: 0,
    padding: "6px 13px"
  },
  "& tr th :first-of-type, & tr td :first-of-type": {
    marginTop: 0
  },
  "& tr th :last-child, & tr td :last-child": {
    marginBottom: 0
  }
}));

// src/components/components/typography/elements/UL.tsx
import { styled as styled22 } from "storybook/theming";
var listCommon2 = {
  paddingLeft: 30,
  "& :first-of-type": {
    marginTop: 0
  },
  "& :last-child": {
    marginBottom: 0
  }
}, UL = styled22.ul(withReset, withMargin, listCommon2, { listStyle: "disc" });

// src/components/components/typography/components.tsx
var components = {
  h1: (props) => React4.createElement(H1, { ...nameSpaceClassNames(props, "h1") }),
  h2: (props) => React4.createElement(H2, { ...nameSpaceClassNames(props, "h2") }),
  h3: (props) => React4.createElement(H3, { ...nameSpaceClassNames(props, "h3") }),
  h4: (props) => React4.createElement(H4, { ...nameSpaceClassNames(props, "h4") }),
  h5: (props) => React4.createElement(H5, { ...nameSpaceClassNames(props, "h5") }),
  h6: (props) => React4.createElement(H6, { ...nameSpaceClassNames(props, "h6") }),
  pre: (props) => React4.createElement(Pre, { ...nameSpaceClassNames(props, "pre") }),
  a: (props) => React4.createElement(A, { ...nameSpaceClassNames(props, "a") }),
  hr: (props) => React4.createElement(HR, { ...nameSpaceClassNames(props, "hr") }),
  dl: (props) => React4.createElement(DL, { ...nameSpaceClassNames(props, "dl") }),
  blockquote: (props) => React4.createElement(Blockquote, { ...nameSpaceClassNames(props, "blockquote") }),
  table: (props) => React4.createElement(Table, { ...nameSpaceClassNames(props, "table") }),
  img: (props) => React4.createElement(Img, { ...nameSpaceClassNames(props, "img") }),
  div: (props) => React4.createElement(Div, { ...nameSpaceClassNames(props, "div") }),
  span: (props) => React4.createElement(Span, { ...nameSpaceClassNames(props, "span") }),
  li: (props) => React4.createElement(LI, { ...nameSpaceClassNames(props, "li") }),
  ul: (props) => React4.createElement(UL, { ...nameSpaceClassNames(props, "ul") }),
  ol: (props) => React4.createElement(OL, { ...nameSpaceClassNames(props, "ol") }),
  p: (props) => React4.createElement(P, { ...nameSpaceClassNames(props, "p") }),
  code: (props) => React4.createElement(Code, { ...nameSpaceClassNames(props, "code") }),
  tt: (props) => React4.createElement(TT, { ...nameSpaceClassNames(props, "tt") }),
  resetwrapper: (props) => React4.createElement(ResetWrapper, { ...nameSpaceClassNames(props, "resetwrapper") })
};

// src/components/components/Badge/Badge.tsx
import React5 from "react";
import { styled as styled23 } from "storybook/theming";
var BadgeWrapper = styled23.div(
  ({ theme, compact }) => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: theme.typography.size.s1,
    fontWeight: theme.typography.weight.bold,
    lineHeight: "12px",
    minWidth: 20,
    borderRadius: 20,
    padding: compact ? "4px 7px" : "4px 10px"
  }),
  {
    svg: {
      height: 12,
      width: 12,
      marginRight: 4,
      marginTop: -2,
      path: {
        fill: "currentColor"
      }
    }
  },
  ({ theme, status }) => {
    switch (status) {
      case "critical":
        return {
          color: theme.fgColor.critical,
          background: theme.bgColor.critical,
          boxShadow: `inset 0 0 0 1px ${theme.borderColor.critical}`
        };
      case "negative":
        return {
          color: theme.fgColor.negative,
          background: theme.bgColor.negative,
          boxShadow: `inset 0 0 0 1px ${theme.borderColor.negative}`
        };
      case "warning":
        return {
          color: theme.fgColor.warning,
          background: theme.bgColor.warning,
          boxShadow: `inset 0 0 0 1px ${theme.borderColor.warning}`
        };
      case "neutral":
        return {
          color: theme.fgColor.muted,
          background: theme.base === "dark" ? theme.barBg : theme.background.app,
          boxShadow: `inset 0 0 0 1px ${curriedTransparentize$1(0.8, theme.textMutedColor)}`
        };
      case "positive":
        return {
          color: theme.fgColor.positive,
          background: theme.bgColor.positive,
          boxShadow: `inset 0 0 0 1px ${theme.borderColor.positive}`
        };
      case "active":
        return {
          color: theme.base === "light" ? curriedDarken$1(0.1, theme.color.secondary) : theme.color.secondary,
          background: theme.background.hoverable,
          boxShadow: `inset 0 0 0 1px ${curriedTransparentize$1(0.9, theme.color.secondary)}`
        };
      default:
        return {};
    }
  }
), Badge = ({ ...props }) => React5.createElement(BadgeWrapper, { ...props });

// src/components/components/typography/link/link.tsx
import React6, { forwardRef } from "react";
import { ChevronRightIcon } from "@storybook/icons";
import { styled as styled24 } from "storybook/theming";
var LEFT_BUTTON = 0, isPlainLeftClick = (e) => e.button === LEFT_BUTTON && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey, cancelled = (e, cb) => {
  isPlainLeftClick(e) && (e.preventDefault(), cb(e));
}, LinkInner = styled24.span(
  ({ withArrow }) => withArrow ? {
    "> svg:last-of-type": {
      height: "0.7em",
      width: "0.7em",
      marginRight: 0,
      marginLeft: "0.25em",
      bottom: "auto",
      verticalAlign: "inherit"
    }
  } : {},
  ({ containsIcon }) => containsIcon ? {
    svg: {
      height: "1em",
      width: "1em",
      verticalAlign: "middle",
      position: "relative",
      bottom: 0,
      marginRight: 0
    }
  } : {}
), A2 = styled24.a(
  ({ theme }) => ({
    display: "inline-block",
    transition: "all 150ms ease-out",
    textDecoration: "none",
    color: theme.color.secondary,
    "&:hover, &:focus": {
      cursor: "pointer",
      color: curriedDarken$1(0.07, theme.color.secondary),
      "svg path:not([fill])": {
        fill: curriedDarken$1(0.07, theme.color.secondary)
      }
    },
    "&:active": {
      color: curriedDarken$1(0.1, theme.color.secondary),
      "svg path:not([fill])": {
        fill: curriedDarken$1(0.1, theme.color.secondary)
      }
    },
    svg: {
      display: "inline-block",
      height: "1em",
      width: "1em",
      verticalAlign: "text-top",
      position: "relative",
      bottom: "-0.125em",
      marginRight: "0.4em",
      "& path": {
        fill: theme.color.secondary
      }
    }
  }),
  ({ theme, secondary, tertiary }) => {
    let colors;
    return secondary && (colors = [theme.textMutedColor, theme.color.secondary, theme.color.secondary]), tertiary && (colors = [theme.color.dark, theme.color.secondary, theme.color.secondary]), colors ? {
      color: colors[0],
      "svg path:not([fill])": {
        fill: colors[0]
      },
      "&:hover": {
        color: colors[1],
        "svg path:not([fill])": {
          fill: colors[1]
        }
      },
      "&:active": {
        color: colors[2],
        "svg path:not([fill])": {
          fill: colors[2]
        }
      }
    } : {};
  },
  ({ nochrome }) => nochrome ? {
    color: "inherit",
    "&:hover, &:active": {
      color: "inherit",
      textDecoration: "underline"
    }
  } : {},
  ({ theme, inverse }) => inverse ? {
    color: theme.color.lightest,
    ":not([fill])": {
      fill: theme.color.lightest
    },
    "&:hover": {
      color: theme.color.lighter,
      "svg path:not([fill])": {
        fill: theme.color.lighter
      }
    },
    "&:active": {
      color: theme.color.light,
      "svg path:not([fill])": {
        fill: theme.color.light
      }
    }
  } : {},
  ({ isButton: isButton2 }) => isButton2 ? {
    border: 0,
    borderRadius: 0,
    background: "none",
    padding: 0,
    fontSize: "inherit"
  } : {}
), Link2 = forwardRef(
  ({
    cancel = !0,
    children,
    onClick = void 0,
    withArrow = !1,
    containsIcon = !1,
    className = void 0,
    style = void 0,
    isButton: isButton2 = !1,
    ...rest
  }, ref) => React6.createElement(
    A2,
    {
      ...rest,
      ref,
      isButton: isButton2,
      role: isButton2 ? "button" : void 0,
      onClick: onClick && cancel ? (e) => cancelled(e, onClick) : onClick,
      className
    },
    React6.createElement(LinkInner, { withArrow, containsIcon }, children, withArrow && React6.createElement(ChevronRightIcon, null))
  )
);
Link2.displayName = "Link";

// src/components/components/typography/DocumentWrapper.tsx
import { styled as styled25 } from "storybook/theming";
var DocumentWrapper = styled25.div(({ theme }) => ({
  fontSize: `${theme.typography.size.s2}px`,
  lineHeight: "1.6",
  h1: {
    fontSize: `${theme.typography.size.l1}px`,
    fontWeight: theme.typography.weight.bold
  },
  h2: {
    fontSize: `${theme.typography.size.m2}px`,
    borderBottom: `1px solid ${theme.appBorderColor}`
  },
  h3: {
    fontSize: `${theme.typography.size.m1}px`
  },
  h4: {
    fontSize: `${theme.typography.size.s3}px`
  },
  h5: {
    fontSize: `${theme.typography.size.s2}px`
  },
  h6: {
    fontSize: `${theme.typography.size.s2}px`,
    color: theme.color.dark
  },
  "pre:not(.prismjs)": {
    background: "transparent",
    border: "none",
    borderRadius: 0,
    padding: 0,
    margin: 0
  },
  "pre pre, pre.prismjs": {
    padding: 15,
    margin: 0,
    whiteSpace: "pre-wrap",
    color: "inherit",
    fontSize: "13px",
    lineHeight: "19px"
  },
  "pre pre code, pre.prismjs code": {
    color: "inherit",
    fontSize: "inherit"
  },
  "pre code": {
    margin: 0,
    padding: 0,
    whiteSpace: "pre",
    border: "none",
    background: "transparent"
  },
  "pre code, pre tt": {
    backgroundColor: "transparent",
    border: "none"
  },
  /* GitHub inspired Markdown styles loosely from https://gist.github.com/tuzz/3331384 */
  "body > *:first-of-type": {
    marginTop: "0 !important"
  },
  "body > *:last-child": {
    marginBottom: "0 !important"
  },
  a: {
    color: theme.color.secondary,
    textDecoration: "none"
  },
  "a.absent": {
    color: "#cc0000"
  },
  "a.anchor": {
    display: "block",
    paddingLeft: 30,
    marginLeft: -30,
    cursor: "pointer",
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0
  },
  "h1, h2, h3, h4, h5, h6": {
    margin: "20px 0 10px",
    padding: 0,
    cursor: "text",
    position: "relative",
    "&:first-of-type": {
      marginTop: 0,
      paddingTop: 0
    },
    "&:hover a.anchor": {
      textDecoration: "none"
    },
    "& tt, & code": {
      fontSize: "inherit"
    }
  },
  "h1:first-of-type + h2": {
    marginTop: 0,
    paddingTop: 0
  },
  "p, blockquote, ul, ol, dl, li, table, pre": {
    margin: "15px 0"
  },
  hr: {
    border: "0 none",
    borderTop: `1px solid ${theme.appBorderColor}`,
    height: 4,
    padding: 0
  },
  "body > h1:first-of-type, body > h2:first-of-type, body > h3:first-of-type, body > h4:first-of-type, body > h5:first-of-type, body > h6:first-of-type": {
    marginTop: 0,
    paddingTop: 0
  },
  "body > h1:first-of-type + h2": {
    marginTop: 0,
    paddingTop: 0
  },
  "a:first-of-type h1, a:first-of-type h2, a:first-of-type h3, a:first-of-type h4, a:first-of-type h5, a:first-of-type h6": {
    marginTop: 0,
    paddingTop: 0
  },
  "h1 p, h2 p, h3 p, h4 p, h5 p, h6 p": {
    marginTop: 0
  },
  "li p.first": {
    display: "inline-block"
  },
  "ul, ol": {
    paddingLeft: 30,
    "& :first-of-type": {
      marginTop: 0
    },
    "& :last-child": {
      marginBottom: 0
    }
  },
  dl: {
    padding: 0
  },
  "dl dt": {
    fontSize: "14px",
    fontWeight: "bold",
    fontStyle: "italic",
    margin: "0 0 15px",
    padding: "0 15px",
    "&:first-of-type": {
      padding: 0
    },
    "& > :first-of-type": {
      marginTop: 0
    },
    "& > :last-child": {
      marginBottom: 0
    }
  },
  blockquote: {
    borderLeft: `4px solid ${theme.color.medium}`,
    padding: "0 15px",
    color: theme.color.dark,
    "& > :first-of-type": {
      marginTop: 0
    },
    "& > :last-child": {
      marginBottom: 0
    }
  },
  table: {
    padding: 0,
    borderCollapse: "collapse",
    "& tr": {
      borderTop: `1px solid ${theme.appBorderColor}`,
      backgroundColor: "white",
      margin: 0,
      padding: 0,
      "& th": {
        fontWeight: "bold",
        border: `1px solid ${theme.appBorderColor}`,
        textAlign: "left",
        margin: 0,
        padding: "6px 13px"
      },
      "& td": {
        border: `1px solid ${theme.appBorderColor}`,
        textAlign: "left",
        margin: 0,
        padding: "6px 13px"
      },
      "&:nth-of-type(2n)": {
        backgroundColor: theme.color.lighter
      },
      "& th :first-of-type, & td :first-of-type": {
        marginTop: 0
      },
      "& th :last-child, & td :last-child": {
        marginBottom: 0
      }
    }
  },
  img: {
    maxWidth: "100%"
  },
  "span.frame": {
    display: "block",
    overflow: "hidden",
    "& > span": {
      border: `1px solid ${theme.color.medium}`,
      display: "block",
      float: "left",
      overflow: "hidden",
      margin: "13px 0 0",
      padding: 7,
      width: "auto"
    },
    "& span img": {
      display: "block",
      float: "left"
    },
    "& span span": {
      clear: "both",
      color: theme.color.darkest,
      display: "block",
      padding: "5px 0 0"
    }
  },
  "span.align-center": {
    display: "block",
    overflow: "hidden",
    clear: "both",
    "& > span": {
      display: "block",
      overflow: "hidden",
      margin: "13px auto 0",
      textAlign: "center"
    },
    "& span img": {
      margin: "0 auto",
      textAlign: "center"
    }
  },
  "span.align-right": {
    display: "block",
    overflow: "hidden",
    clear: "both",
    "& > span": {
      display: "block",
      overflow: "hidden",
      margin: "13px 0 0",
      textAlign: "right"
    },
    "& span img": {
      margin: 0,
      textAlign: "right"
    }
  },
  "span.float-left": {
    display: "block",
    marginRight: 13,
    overflow: "hidden",
    float: "left",
    "& span": {
      margin: "13px 0 0"
    }
  },
  "span.float-right": {
    display: "block",
    marginLeft: 13,
    overflow: "hidden",
    float: "right",
    "& > span": {
      display: "block",
      overflow: "hidden",
      margin: "13px auto 0",
      textAlign: "right"
    }
  },
  "code, tt": {
    margin: "0 2px",
    padding: "0 5px",
    whiteSpace: "nowrap",
    border: `1px solid ${theme.color.mediumlight}`,
    backgroundColor: theme.color.lighter,
    borderRadius: 3,
    color: theme.base === "dark" ? theme.color.darkest : theme.color.dark
  }
}));

// src/components/components/ActionList/ActionList.tsx
import React16, { forwardRef as forwardRef6 } from "react";
import { styled as styled30 } from "storybook/theming";

// src/components/components/Button/Button.tsx
import React14, { forwardRef as forwardRef4, useEffect, useMemo as useMemo2, useState as useState3 } from "react";
import { deprecate as deprecate2 } from "storybook/internal/client-logger";

// ../node_modules/@radix-ui/react-slot/dist/index.mjs
import * as React8 from "react";

// ../node_modules/@radix-ui/react-slot/node_modules/@radix-ui/react-compose-refs/dist/index.mjs
import * as React7 from "react";
function setRef(ref, value) {
  if (typeof ref == "function")
    return ref(value);
  ref != null && (ref.current = value);
}
function composeRefs(...refs) {
  return (node) => {
    let hasCleanup = !1, cleanups = refs.map((ref) => {
      let cleanup = setRef(ref, node);
      return !hasCleanup && typeof cleanup == "function" && (hasCleanup = !0), cleanup;
    });
    if (hasCleanup)
      return () => {
        for (let i = 0; i < cleanups.length; i++) {
          let cleanup = cleanups[i];
          typeof cleanup == "function" ? cleanup() : setRef(refs[i], null);
        }
      };
  };
}

// ../node_modules/@radix-ui/react-slot/dist/index.mjs
import { Fragment as Fragment2, jsx } from "react/jsx-runtime";
var REACT_LAZY_TYPE = Symbol.for("react.lazy"), use = React8[" use ".trim().toString()];
function isPromiseLike(value) {
  return typeof value == "object" && value !== null && "then" in value;
}
function isLazyComponent(element) {
  return element != null && typeof element == "object" && "$$typeof" in element && element.$$typeof === REACT_LAZY_TYPE && "_payload" in element && isPromiseLike(element._payload);
}
function createSlot(ownerName) {
  let SlotClone = createSlotClone(ownerName), Slot2 = React8.forwardRef((props, forwardedRef) => {
    let { children, ...slotProps } = props;
    isLazyComponent(children) && typeof use == "function" && (children = use(children._payload));
    let childrenArray = React8.Children.toArray(children), slottable = childrenArray.find(isSlottable);
    if (slottable) {
      let newElement = slottable.props.children, newChildren = childrenArray.map((child) => child === slottable ? React8.Children.count(newElement) > 1 ? React8.Children.only(null) : React8.isValidElement(newElement) ? newElement.props.children : null : child);
      return jsx(SlotClone, { ...slotProps, ref: forwardedRef, children: React8.isValidElement(newElement) ? React8.cloneElement(newElement, void 0, newChildren) : null });
    }
    return jsx(SlotClone, { ...slotProps, ref: forwardedRef, children });
  });
  return Slot2.displayName = `${ownerName}.Slot`, Slot2;
}
var Slot = createSlot("Slot");
function createSlotClone(ownerName) {
  let SlotClone = React8.forwardRef((props, forwardedRef) => {
    let { children, ...slotProps } = props;
    if (isLazyComponent(children) && typeof use == "function" && (children = use(children._payload)), React8.isValidElement(children)) {
      let childrenRef = getElementRef(children), props2 = mergeProps(slotProps, children.props);
      return children.type !== React8.Fragment && (props2.ref = forwardedRef ? composeRefs(forwardedRef, childrenRef) : childrenRef), React8.cloneElement(children, props2);
    }
    return React8.Children.count(children) > 1 ? React8.Children.only(null) : null;
  });
  return SlotClone.displayName = `${ownerName}.SlotClone`, SlotClone;
}
var SLOTTABLE_IDENTIFIER = Symbol("radix.slottable");
function createSlottable(ownerName) {
  let Slottable2 = ({ children }) => jsx(Fragment2, { children });
  return Slottable2.displayName = `${ownerName}.Slottable`, Slottable2.__radixId = SLOTTABLE_IDENTIFIER, Slottable2;
}
var Slottable = createSlottable("Slottable");
function isSlottable(child) {
  return React8.isValidElement(child) && typeof child.type == "function" && "__radixId" in child.type && child.type.__radixId === SLOTTABLE_IDENTIFIER;
}
function mergeProps(slotProps, childProps) {
  let overrideProps = { ...childProps };
  for (let propName in childProps) {
    let slotPropValue = slotProps[propName], childPropValue = childProps[propName];
    /^on[A-Z]/.test(propName) ? slotPropValue && childPropValue ? overrideProps[propName] = (...args) => {
      let result = childPropValue(...args);
      return slotPropValue(...args), result;
    } : slotPropValue && (overrideProps[propName] = slotPropValue) : propName === "style" ? overrideProps[propName] = { ...slotPropValue, ...childPropValue } : propName === "className" && (overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(" "));
  }
  return { ...slotProps, ...overrideProps };
}
function getElementRef(element) {
  let getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get, mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  return mayWarn ? element.ref : (getter = Object.getOwnPropertyDescriptor(element, "ref")?.get, mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning, mayWarn ? element.props.ref : element.props.ref || element.ref);
}

// src/components/components/Button/Button.tsx
import { shortcutToAriaKeyshortcuts } from "storybook/manager-api";
import { isPropValid, styled as styled28 } from "storybook/theming";

// src/components/components/Button/helpers/InteractiveTooltipWrapper.tsx
import React12, { useMemo } from "react";
import { shortcutToHumanString } from "storybook/manager-api";

// src/components/components/tooltip/TooltipNote.tsx
import React9 from "react";
import { styled as styled26 } from "storybook/theming";
var Note = styled26.div(({ theme }) => ({
  padding: "2px 6px",
  lineHeight: "16px",
  fontSize: 10,
  fontWeight: theme.typography.weight.bold,
  color: theme.color.lightest,
  boxShadow: "0 0 5px 0 rgba(0, 0, 0, 0.3)",
  borderRadius: 4,
  whiteSpace: "nowrap",
  pointerEvents: "none",
  zIndex: -1,
  background: theme.base === "light" ? "rgba(60, 60, 60, 0.9)" : "rgba(0, 0, 0, 0.95)"
})), TooltipNote = ({ note, ...props }) => React9.createElement(Note, { ...props }, note);

// src/components/components/tooltip/TooltipProvider.tsx
import React11, { useCallback as useCallback2, useState as useState2 } from "react";
import { deprecate } from "storybook/internal/client-logger";

// ../node_modules/@react-aria/utils/dist/useLayoutEffect.mjs
import $HgANd$react from "react";
var $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c = typeof document < "u" ? $HgANd$react.useLayoutEffect : () => {
};

// ../node_modules/@react-aria/utils/dist/useEffectEvent.mjs
import $lmaYr$react, { useRef as $lmaYr$useRef, useCallback as $lmaYr$useCallback } from "react";
var $8ae05eaa5c114e9c$var$_React_useInsertionEffect, $8ae05eaa5c114e9c$var$useEarlyEffect = ($8ae05eaa5c114e9c$var$_React_useInsertionEffect = $lmaYr$react.useInsertionEffect) !== null && $8ae05eaa5c114e9c$var$_React_useInsertionEffect !== void 0 ? $8ae05eaa5c114e9c$var$_React_useInsertionEffect : $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c;
function $8ae05eaa5c114e9c$export$7f54fc3180508a52(fn) {
  let ref = $lmaYr$useRef(null);
  return $8ae05eaa5c114e9c$var$useEarlyEffect(() => {
    ref.current = fn;
  }, [
    fn
  ]), $lmaYr$useCallback((...args) => {
    let f = ref.current;
    return f?.(...args);
  }, []);
}

// ../node_modules/@react-aria/utils/dist/useValueEffect.mjs
import { useState as $fCAlL$useState, useRef as $fCAlL$useRef } from "react";
function $1dbecbe27a04f9af$export$14d238f342723f25(defaultValue) {
  let [value, setValue] = $fCAlL$useState(defaultValue), effect = $fCAlL$useRef(null), nextRef = $8ae05eaa5c114e9c$export$7f54fc3180508a52(() => {
    if (!effect.current) return;
    let newValue = effect.current.next();
    if (newValue.done) {
      effect.current = null;
      return;
    }
    value === newValue.value ? nextRef() : setValue(newValue.value);
  });
  $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => {
    effect.current && nextRef();
  });
  let queue = $8ae05eaa5c114e9c$export$7f54fc3180508a52((fn) => {
    effect.current = fn(value), nextRef();
  });
  return [
    value,
    queue
  ];
}

// ../node_modules/@react-aria/utils/dist/useId.mjs
import { useState as $eKkEp$useState, useRef as $eKkEp$useRef, useEffect as $eKkEp$useEffect, useCallback as $eKkEp$useCallback } from "react";

// ../node_modules/@react-aria/ssr/dist/SSRProvider.mjs
import $670gB$react, { useContext as $670gB$useContext, useState as $670gB$useState, useMemo as $670gB$useMemo, useLayoutEffect as $670gB$useLayoutEffect, useRef as $670gB$useRef } from "react";
var $b5e257d569688ac6$var$defaultContext = {
  prefix: String(Math.round(Math.random() * 1e10)),
  current: 0
}, $b5e257d569688ac6$var$SSRContext = $670gB$react.createContext($b5e257d569688ac6$var$defaultContext), $b5e257d569688ac6$var$IsSSRContext = $670gB$react.createContext(!1);
var $b5e257d569688ac6$var$canUseDOM = !!(typeof window < "u" && window.document && window.document.createElement), $b5e257d569688ac6$var$componentIds = /* @__PURE__ */ new WeakMap();
function $b5e257d569688ac6$var$useCounter(isDisabled = !1) {
  let ctx = $670gB$useContext($b5e257d569688ac6$var$SSRContext), ref = $670gB$useRef(null);
  if (ref.current === null && !isDisabled) {
    var _React___SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_ReactCurrentOwner, _React___SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    let currentOwner = (_React___SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = $670gB$react.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) === null || _React___SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED === void 0 || (_React___SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_ReactCurrentOwner = _React___SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner) === null || _React___SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_ReactCurrentOwner === void 0 ? void 0 : _React___SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_ReactCurrentOwner.current;
    if (currentOwner) {
      let prevComponentValue = $b5e257d569688ac6$var$componentIds.get(currentOwner);
      prevComponentValue == null ? $b5e257d569688ac6$var$componentIds.set(currentOwner, {
        id: ctx.current,
        state: currentOwner.memoizedState
      }) : currentOwner.memoizedState !== prevComponentValue.state && (ctx.current = prevComponentValue.id, $b5e257d569688ac6$var$componentIds.delete(currentOwner));
    }
    ref.current = ++ctx.current;
  }
  return ref.current;
}
function $b5e257d569688ac6$var$useLegacySSRSafeId(defaultId) {
  let ctx = $670gB$useContext($b5e257d569688ac6$var$SSRContext);
  ctx === $b5e257d569688ac6$var$defaultContext && !$b5e257d569688ac6$var$canUseDOM && process.env.NODE_ENV !== "production" && console.warn("When server rendering, you must wrap your application in an <SSRProvider> to ensure consistent ids are generated between the client and server.");
  let counter = $b5e257d569688ac6$var$useCounter(!!defaultId), prefix = ctx === $b5e257d569688ac6$var$defaultContext && process.env.NODE_ENV === "test" ? "react-aria" : `react-aria${ctx.prefix}`;
  return defaultId || `${prefix}-${counter}`;
}
function $b5e257d569688ac6$var$useModernSSRSafeId(defaultId) {
  let id = $670gB$react.useId(), [didSSR] = $670gB$useState($b5e257d569688ac6$export$535bd6ca7f90a273()), prefix = didSSR || process.env.NODE_ENV === "test" ? "react-aria" : `react-aria${$b5e257d569688ac6$var$defaultContext.prefix}`;
  return defaultId || `${prefix}-${id}`;
}
var $b5e257d569688ac6$export$619500959fc48b26 = typeof $670gB$react.useId == "function" ? $b5e257d569688ac6$var$useModernSSRSafeId : $b5e257d569688ac6$var$useLegacySSRSafeId;
function $b5e257d569688ac6$var$getSnapshot() {
  return !1;
}
function $b5e257d569688ac6$var$getServerSnapshot() {
  return !0;
}
function $b5e257d569688ac6$var$subscribe(onStoreChange) {
  return () => {
  };
}
function $b5e257d569688ac6$export$535bd6ca7f90a273() {
  return typeof $670gB$react.useSyncExternalStore == "function" ? $670gB$react.useSyncExternalStore($b5e257d569688ac6$var$subscribe, $b5e257d569688ac6$var$getSnapshot, $b5e257d569688ac6$var$getServerSnapshot) : $670gB$useContext($b5e257d569688ac6$var$IsSSRContext);
}

// ../node_modules/@react-aria/utils/dist/useId.mjs
var $bdb11010cef70236$var$canUseDOM = !!(typeof window < "u" && window.document && window.document.createElement), $bdb11010cef70236$export$d41a04c74483c6ef = /* @__PURE__ */ new Map(), $bdb11010cef70236$var$registry;
typeof FinalizationRegistry < "u" && ($bdb11010cef70236$var$registry = new FinalizationRegistry((heldValue) => {
  $bdb11010cef70236$export$d41a04c74483c6ef.delete(heldValue);
}));
function $bdb11010cef70236$export$f680877a34711e37(defaultId) {
  let [value, setValue] = $eKkEp$useState(defaultId), nextId = $eKkEp$useRef(null), res = $b5e257d569688ac6$export$619500959fc48b26(value), cleanupRef = $eKkEp$useRef(null);
  if ($bdb11010cef70236$var$registry && $bdb11010cef70236$var$registry.register(cleanupRef, res), $bdb11010cef70236$var$canUseDOM) {
    let cacheIdRef = $bdb11010cef70236$export$d41a04c74483c6ef.get(res);
    cacheIdRef && !cacheIdRef.includes(nextId) ? cacheIdRef.push(nextId) : $bdb11010cef70236$export$d41a04c74483c6ef.set(res, [
      nextId
    ]);
  }
  return $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => {
    let r2 = res;
    return () => {
      $bdb11010cef70236$var$registry && $bdb11010cef70236$var$registry.unregister(cleanupRef), $bdb11010cef70236$export$d41a04c74483c6ef.delete(r2);
    };
  }, [
    res
  ]), $eKkEp$useEffect(() => {
    let newId = nextId.current;
    return newId && setValue(newId), () => {
      newId && (nextId.current = null);
    };
  }), res;
}
function $bdb11010cef70236$export$cd8c9cb68f842629(idA, idB) {
  if (idA === idB) return idA;
  let setIdsA = $bdb11010cef70236$export$d41a04c74483c6ef.get(idA);
  if (setIdsA)
    return setIdsA.forEach((ref) => ref.current = idB), idB;
  let setIdsB = $bdb11010cef70236$export$d41a04c74483c6ef.get(idB);
  return setIdsB ? (setIdsB.forEach((ref) => ref.current = idA), idA) : idB;
}
function $bdb11010cef70236$export$b4cc09c592e8fdb8(depArray = []) {
  let id = $bdb11010cef70236$export$f680877a34711e37(), [resolvedId, setResolvedId] = $1dbecbe27a04f9af$export$14d238f342723f25(id), updateId = $eKkEp$useCallback(() => {
    setResolvedId(function* () {
      yield id, yield document.getElementById(id) ? id : void 0;
    });
  }, [
    id,
    setResolvedId
  ]);
  return $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(updateId, [
    id,
    updateId,
    ...depArray
  ]), resolvedId;
}

// ../node_modules/@react-aria/utils/dist/chain.mjs
function $ff5963eb1fccf552$export$e08e3b67e392101e(...callbacks) {
  return (...args) => {
    for (let callback of callbacks) typeof callback == "function" && callback(...args);
  };
}

// ../node_modules/@react-aria/utils/dist/domHelpers.mjs
var $431fbd86ca7dc216$export$b204af158042fbac = (el) => {
  var _el_ownerDocument;
  return (_el_ownerDocument = el?.ownerDocument) !== null && _el_ownerDocument !== void 0 ? _el_ownerDocument : document;
}, $431fbd86ca7dc216$export$f21a1ffae260145a = (el) => el && "window" in el && el.window === el ? el : $431fbd86ca7dc216$export$b204af158042fbac(el).defaultView || window;
function $431fbd86ca7dc216$var$isNode(value) {
  return value !== null && typeof value == "object" && "nodeType" in value && typeof value.nodeType == "number";
}
function $431fbd86ca7dc216$export$af51f0f06c0f328a(node) {
  return $431fbd86ca7dc216$var$isNode(node) && node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && "host" in node;
}

// ../node_modules/@react-stately/flags/dist/import.mjs
var $f4e2df6bd15f8569$var$_shadowDOM = !1;
function $f4e2df6bd15f8569$export$98658e8c59125e6a() {
  return $f4e2df6bd15f8569$var$_shadowDOM;
}

// ../node_modules/@react-aria/utils/dist/DOMFunctions.mjs
function $d4ee10de306f2510$export$4282f70798064fe0(node, otherNode) {
  if (!$f4e2df6bd15f8569$export$98658e8c59125e6a()) return otherNode && node ? node.contains(otherNode) : !1;
  if (!node || !otherNode) return !1;
  let currentNode = otherNode;
  for (; currentNode !== null; ) {
    if (currentNode === node) return !0;
    currentNode.tagName === "SLOT" && currentNode.assignedSlot ? currentNode = currentNode.assignedSlot.parentNode : $431fbd86ca7dc216$export$af51f0f06c0f328a(currentNode) ? currentNode = currentNode.host : currentNode = currentNode.parentNode;
  }
  return !1;
}
var $d4ee10de306f2510$export$cd4e5573fbe2b576 = (doc = document) => {
  var _activeElement_shadowRoot;
  if (!$f4e2df6bd15f8569$export$98658e8c59125e6a()) return doc.activeElement;
  let activeElement = doc.activeElement;
  for (; activeElement && "shadowRoot" in activeElement && (!((_activeElement_shadowRoot = activeElement.shadowRoot) === null || _activeElement_shadowRoot === void 0) && _activeElement_shadowRoot.activeElement); ) activeElement = activeElement.shadowRoot.activeElement;
  return activeElement;
};
function $d4ee10de306f2510$export$e58f029f0fbfdb29(event) {
  return $f4e2df6bd15f8569$export$98658e8c59125e6a() && event.target.shadowRoot && event.composedPath ? event.composedPath()[0] : event.target;
}

// ../node_modules/@react-aria/utils/dist/ShadowTreeWalker.mjs
var $dfc540311bf7f109$export$63eb3ababa9c55c4 = class {
  get currentNode() {
    return this._currentNode;
  }
  set currentNode(node) {
    if (!$d4ee10de306f2510$export$4282f70798064fe0(this.root, node)) throw new Error("Cannot set currentNode to a node that is not contained by the root node.");
    let walkers = [], curNode = node, currentWalkerCurrentNode = node;
    for (this._currentNode = node; curNode && curNode !== this.root; ) if (curNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      let shadowRoot = curNode, walker2 = this._doc.createTreeWalker(shadowRoot, this.whatToShow, {
        acceptNode: this._acceptNode
      });
      walkers.push(walker2), walker2.currentNode = currentWalkerCurrentNode, this._currentSetFor.add(walker2), curNode = currentWalkerCurrentNode = shadowRoot.host;
    } else curNode = curNode.parentNode;
    let walker = this._doc.createTreeWalker(this.root, this.whatToShow, {
      acceptNode: this._acceptNode
    });
    walkers.push(walker), walker.currentNode = currentWalkerCurrentNode, this._currentSetFor.add(walker), this._walkerStack = walkers;
  }
  get doc() {
    return this._doc;
  }
  firstChild() {
    let currentNode = this.currentNode, newNode = this.nextNode();
    return $d4ee10de306f2510$export$4282f70798064fe0(currentNode, newNode) ? (newNode && (this.currentNode = newNode), newNode) : (this.currentNode = currentNode, null);
  }
  lastChild() {
    let newNode = this._walkerStack[0].lastChild();
    return newNode && (this.currentNode = newNode), newNode;
  }
  nextNode() {
    let nextNode = this._walkerStack[0].nextNode();
    if (nextNode) {
      if (nextNode.shadowRoot) {
        var _this_filter;
        let nodeResult;
        if (typeof this.filter == "function" ? nodeResult = this.filter(nextNode) : !((_this_filter = this.filter) === null || _this_filter === void 0) && _this_filter.acceptNode && (nodeResult = this.filter.acceptNode(nextNode)), nodeResult === NodeFilter.FILTER_ACCEPT)
          return this.currentNode = nextNode, nextNode;
        let newNode = this.nextNode();
        return newNode && (this.currentNode = newNode), newNode;
      }
      return nextNode && (this.currentNode = nextNode), nextNode;
    } else if (this._walkerStack.length > 1) {
      this._walkerStack.shift();
      let newNode = this.nextNode();
      return newNode && (this.currentNode = newNode), newNode;
    } else return null;
  }
  previousNode() {
    let currentWalker = this._walkerStack[0];
    if (currentWalker.currentNode === currentWalker.root) {
      if (this._currentSetFor.has(currentWalker))
        if (this._currentSetFor.delete(currentWalker), this._walkerStack.length > 1) {
          this._walkerStack.shift();
          let newNode = this.previousNode();
          return newNode && (this.currentNode = newNode), newNode;
        } else return null;
      return null;
    }
    let previousNode = currentWalker.previousNode();
    if (previousNode) {
      if (previousNode.shadowRoot) {
        var _this_filter;
        let nodeResult;
        if (typeof this.filter == "function" ? nodeResult = this.filter(previousNode) : !((_this_filter = this.filter) === null || _this_filter === void 0) && _this_filter.acceptNode && (nodeResult = this.filter.acceptNode(previousNode)), nodeResult === NodeFilter.FILTER_ACCEPT)
          return previousNode && (this.currentNode = previousNode), previousNode;
        let newNode = this.lastChild();
        return newNode && (this.currentNode = newNode), newNode;
      }
      return previousNode && (this.currentNode = previousNode), previousNode;
    } else if (this._walkerStack.length > 1) {
      this._walkerStack.shift();
      let newNode = this.previousNode();
      return newNode && (this.currentNode = newNode), newNode;
    } else return null;
  }
  /**
   * @deprecated
   */
  nextSibling() {
    return null;
  }
  /**
   * @deprecated
   */
  previousSibling() {
    return null;
  }
  /**
   * @deprecated
   */
  parentNode() {
    return null;
  }
  constructor(doc, root, whatToShow, filter) {
    this._walkerStack = [], this._currentSetFor = /* @__PURE__ */ new Set(), this._acceptNode = (node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        let shadowRoot2 = node.shadowRoot;
        if (shadowRoot2) {
          let walker = this._doc.createTreeWalker(shadowRoot2, this.whatToShow, {
            acceptNode: this._acceptNode
          });
          return this._walkerStack.unshift(walker), NodeFilter.FILTER_ACCEPT;
        } else {
          var _this_filter;
          if (typeof this.filter == "function") return this.filter(node);
          if (!((_this_filter = this.filter) === null || _this_filter === void 0) && _this_filter.acceptNode) return this.filter.acceptNode(node);
          if (this.filter === null) return NodeFilter.FILTER_ACCEPT;
        }
      }
      return NodeFilter.FILTER_SKIP;
    }, this._doc = doc, this.root = root, this.filter = filter ?? null, this.whatToShow = whatToShow ?? NodeFilter.SHOW_ALL, this._currentNode = root, this._walkerStack.unshift(doc.createTreeWalker(root, whatToShow, this._acceptNode));
    let shadowRoot = root.shadowRoot;
    if (shadowRoot) {
      let walker = this._doc.createTreeWalker(shadowRoot, this.whatToShow, {
        acceptNode: this._acceptNode
      });
      this._walkerStack.unshift(walker);
    }
  }
};
function $dfc540311bf7f109$export$4d0f8be8b12a7ef6(doc, root, whatToShow, filter) {
  return $f4e2df6bd15f8569$export$98658e8c59125e6a() ? new $dfc540311bf7f109$export$63eb3ababa9c55c4(doc, root, whatToShow, filter) : doc.createTreeWalker(root, whatToShow, filter);
}

// ../node_modules/clsx/dist/clsx.mjs
function r(e) {
  var t, f, n = "";
  if (typeof e == "string" || typeof e == "number") n += e;
  else if (typeof e == "object") if (Array.isArray(e)) {
    var o = e.length;
    for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
  } else for (f in e) e[f] && (n && (n += " "), n += f);
  return n;
}
function clsx() {
  for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
  return n;
}
var clsx_default = clsx;

// ../node_modules/@react-aria/utils/dist/mergeProps.mjs
function $3ef42575df84b30b$export$9d1611c77c2fe928(...args) {
  let result = {
    ...args[0]
  };
  for (let i = 1; i < args.length; i++) {
    let props = args[i];
    for (let key in props) {
      let a = result[key], b = props[key];
      typeof a == "function" && typeof b == "function" && // This is a lot faster than a regex.
      key[0] === "o" && key[1] === "n" && key.charCodeAt(2) >= /* 'A' */
      65 && key.charCodeAt(2) <= /* 'Z' */
      90 ? result[key] = $ff5963eb1fccf552$export$e08e3b67e392101e(a, b) : (key === "className" || key === "UNSAFE_className") && typeof a == "string" && typeof b == "string" ? result[key] = clsx_default(a, b) : key === "id" && a && b ? result.id = $bdb11010cef70236$export$cd8c9cb68f842629(a, b) : result[key] = b !== void 0 ? b : a;
    }
  }
  return result;
}

// ../node_modules/@react-aria/utils/dist/mergeRefs.mjs
function $5dc95899b306f630$export$c9058316764c140e(...refs) {
  return refs.length === 1 && refs[0] ? refs[0] : (value) => {
    let hasCleanup = !1, cleanups = refs.map((ref) => {
      let cleanup = $5dc95899b306f630$var$setRef(ref, value);
      return hasCleanup || (hasCleanup = typeof cleanup == "function"), cleanup;
    });
    if (hasCleanup) return () => {
      cleanups.forEach((cleanup, i) => {
        typeof cleanup == "function" ? cleanup() : $5dc95899b306f630$var$setRef(refs[i], null);
      });
    };
  };
}
function $5dc95899b306f630$var$setRef(ref, value) {
  if (typeof ref == "function") return ref(value);
  ref != null && (ref.current = value);
}

// ../node_modules/@react-aria/utils/dist/filterDOMProps.mjs
var $65484d02dcb7eb3e$var$DOMPropNames = /* @__PURE__ */ new Set([
  "id"
]), $65484d02dcb7eb3e$var$labelablePropNames = /* @__PURE__ */ new Set([
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "aria-details"
]), $65484d02dcb7eb3e$var$linkPropNames = /* @__PURE__ */ new Set([
  "href",
  "hrefLang",
  "target",
  "rel",
  "download",
  "ping",
  "referrerPolicy"
]), $65484d02dcb7eb3e$var$globalAttrs = /* @__PURE__ */ new Set([
  "dir",
  "lang",
  "hidden",
  "inert",
  "translate"
]), $65484d02dcb7eb3e$var$globalEvents = /* @__PURE__ */ new Set([
  "onClick",
  "onAuxClick",
  "onContextMenu",
  "onDoubleClick",
  "onMouseDown",
  "onMouseEnter",
  "onMouseLeave",
  "onMouseMove",
  "onMouseOut",
  "onMouseOver",
  "onMouseUp",
  "onTouchCancel",
  "onTouchEnd",
  "onTouchMove",
  "onTouchStart",
  "onPointerDown",
  "onPointerMove",
  "onPointerUp",
  "onPointerCancel",
  "onPointerEnter",
  "onPointerLeave",
  "onPointerOver",
  "onPointerOut",
  "onGotPointerCapture",
  "onLostPointerCapture",
  "onScroll",
  "onWheel",
  "onAnimationStart",
  "onAnimationEnd",
  "onAnimationIteration",
  "onTransitionCancel",
  "onTransitionEnd",
  "onTransitionRun",
  "onTransitionStart"
]), $65484d02dcb7eb3e$var$propRe = /^(data-.*)$/;
function $65484d02dcb7eb3e$export$457c3d6518dd4c6f(props, opts = {}) {
  let { labelable, isLink: isLink2, global: global2, events = global2, propNames } = opts, filteredProps = {};
  for (let prop in props) Object.prototype.hasOwnProperty.call(props, prop) && ($65484d02dcb7eb3e$var$DOMPropNames.has(prop) || labelable && $65484d02dcb7eb3e$var$labelablePropNames.has(prop) || isLink2 && $65484d02dcb7eb3e$var$linkPropNames.has(prop) || global2 && $65484d02dcb7eb3e$var$globalAttrs.has(prop) || events && $65484d02dcb7eb3e$var$globalEvents.has(prop) || prop.endsWith("Capture") && $65484d02dcb7eb3e$var$globalEvents.has(prop.slice(0, -7)) || propNames?.has(prop) || $65484d02dcb7eb3e$var$propRe.test(prop)) && (filteredProps[prop] = props[prop]);
  return filteredProps;
}

// ../node_modules/@react-aria/utils/dist/focusWithoutScrolling.mjs
function $7215afc6de606d6b$export$de79e2c695e052f3(element) {
  if ($7215afc6de606d6b$var$supportsPreventScroll()) element.focus({
    preventScroll: !0
  });
  else {
    let scrollableElements = $7215afc6de606d6b$var$getScrollableElements(element);
    element.focus(), $7215afc6de606d6b$var$restoreScrollPosition(scrollableElements);
  }
}
var $7215afc6de606d6b$var$supportsPreventScrollCached = null;
function $7215afc6de606d6b$var$supportsPreventScroll() {
  if ($7215afc6de606d6b$var$supportsPreventScrollCached == null) {
    $7215afc6de606d6b$var$supportsPreventScrollCached = !1;
    try {
      document.createElement("div").focus({
        get preventScroll() {
          return $7215afc6de606d6b$var$supportsPreventScrollCached = !0, !0;
        }
      });
    } catch {
    }
  }
  return $7215afc6de606d6b$var$supportsPreventScrollCached;
}
function $7215afc6de606d6b$var$getScrollableElements(element) {
  let parent = element.parentNode, scrollableElements = [], rootScrollingElement = document.scrollingElement || document.documentElement;
  for (; parent instanceof HTMLElement && parent !== rootScrollingElement; )
    (parent.offsetHeight < parent.scrollHeight || parent.offsetWidth < parent.scrollWidth) && scrollableElements.push({
      element: parent,
      scrollTop: parent.scrollTop,
      scrollLeft: parent.scrollLeft
    }), parent = parent.parentNode;
  return rootScrollingElement instanceof HTMLElement && scrollableElements.push({
    element: rootScrollingElement,
    scrollTop: rootScrollingElement.scrollTop,
    scrollLeft: rootScrollingElement.scrollLeft
  }), scrollableElements;
}
function $7215afc6de606d6b$var$restoreScrollPosition(scrollableElements) {
  for (let { element, scrollTop, scrollLeft } of scrollableElements)
    element.scrollTop = scrollTop, element.scrollLeft = scrollLeft;
}

// ../node_modules/@react-aria/utils/dist/platform.mjs
function $c87311424ea30a05$var$testUserAgent(re) {
  var _window_navigator_userAgentData;
  if (typeof window > "u" || window.navigator == null) return !1;
  let brands = (_window_navigator_userAgentData = window.navigator.userAgentData) === null || _window_navigator_userAgentData === void 0 ? void 0 : _window_navigator_userAgentData.brands;
  return Array.isArray(brands) && brands.some((brand) => re.test(brand.brand)) || re.test(window.navigator.userAgent);
}
function $c87311424ea30a05$var$testPlatform(re) {
  var _window_navigator_userAgentData;
  return typeof window < "u" && window.navigator != null ? re.test(((_window_navigator_userAgentData = window.navigator.userAgentData) === null || _window_navigator_userAgentData === void 0 ? void 0 : _window_navigator_userAgentData.platform) || window.navigator.platform) : !1;
}
function $c87311424ea30a05$var$cached(fn) {
  if (process.env.NODE_ENV === "test") return fn;
  let res = null;
  return () => (res == null && (res = fn()), res);
}
var $c87311424ea30a05$export$9ac100e40613ea10 = $c87311424ea30a05$var$cached(function() {
  return $c87311424ea30a05$var$testPlatform(/^Mac/i);
}), $c87311424ea30a05$export$186c6964ca17d99 = $c87311424ea30a05$var$cached(function() {
  return $c87311424ea30a05$var$testPlatform(/^iPhone/i);
}), $c87311424ea30a05$export$7bef049ce92e4224 = $c87311424ea30a05$var$cached(function() {
  return $c87311424ea30a05$var$testPlatform(/^iPad/i) || // iPadOS 13 lies and says it's a Mac, but we can distinguish by detecting touch support.
  $c87311424ea30a05$export$9ac100e40613ea10() && navigator.maxTouchPoints > 1;
}), $c87311424ea30a05$export$fedb369cb70207f1 = $c87311424ea30a05$var$cached(function() {
  return $c87311424ea30a05$export$186c6964ca17d99() || $c87311424ea30a05$export$7bef049ce92e4224();
}), $c87311424ea30a05$export$e1865c3bedcd822b = $c87311424ea30a05$var$cached(function() {
  return $c87311424ea30a05$export$9ac100e40613ea10() || $c87311424ea30a05$export$fedb369cb70207f1();
}), $c87311424ea30a05$export$78551043582a6a98 = $c87311424ea30a05$var$cached(function() {
  return $c87311424ea30a05$var$testUserAgent(/AppleWebKit/i) && !$c87311424ea30a05$export$6446a186d09e379e();
}), $c87311424ea30a05$export$6446a186d09e379e = $c87311424ea30a05$var$cached(function() {
  return $c87311424ea30a05$var$testUserAgent(/Chrome/i);
}), $c87311424ea30a05$export$a11b0059900ceec8 = $c87311424ea30a05$var$cached(function() {
  return $c87311424ea30a05$var$testUserAgent(/Android/i);
}), $c87311424ea30a05$export$b7d78993b74f766d = $c87311424ea30a05$var$cached(function() {
  return $c87311424ea30a05$var$testUserAgent(/Firefox/i);
});

// ../node_modules/@react-aria/utils/dist/openLink.mjs
import $g3jFn$react, { createContext as $g3jFn$createContext, useMemo as $g3jFn$useMemo, useContext as $g3jFn$useContext } from "react";
var $ea8dcbcb9ea1b556$var$RouterContext = $g3jFn$createContext({
  isNative: !0,
  open: $ea8dcbcb9ea1b556$var$openSyntheticLink,
  useHref: (href) => href
});
function $ea8dcbcb9ea1b556$export$9a302a45f65d0572() {
  return $g3jFn$useContext($ea8dcbcb9ea1b556$var$RouterContext);
}
function $ea8dcbcb9ea1b556$export$efa8c9099e530235(link, modifiers) {
  let target = link.getAttribute("target");
  return (!target || target === "_self") && link.origin === location.origin && !link.hasAttribute("download") && !modifiers.metaKey && // open in new tab (mac)
  !modifiers.ctrlKey && // open in new tab (windows)
  !modifiers.altKey && // download
  !modifiers.shiftKey;
}
function $ea8dcbcb9ea1b556$export$95185d699e05d4d7(target, modifiers, setOpening = !0) {
  var _window_event_type, _window_event;
  let { metaKey, ctrlKey, altKey, shiftKey } = modifiers;
  $c87311424ea30a05$export$b7d78993b74f766d() && (!((_window_event = window.event) === null || _window_event === void 0 || (_window_event_type = _window_event.type) === null || _window_event_type === void 0) && _window_event_type.startsWith("key")) && target.target === "_blank" && ($c87311424ea30a05$export$9ac100e40613ea10() ? metaKey = !0 : ctrlKey = !0);
  let event = $c87311424ea30a05$export$78551043582a6a98() && $c87311424ea30a05$export$9ac100e40613ea10() && !$c87311424ea30a05$export$7bef049ce92e4224() && process.env.NODE_ENV !== "test" ? new KeyboardEvent("keydown", {
    keyIdentifier: "Enter",
    metaKey,
    ctrlKey,
    altKey,
    shiftKey
  }) : new MouseEvent("click", {
    metaKey,
    ctrlKey,
    altKey,
    shiftKey,
    bubbles: !0,
    cancelable: !0
  });
  $ea8dcbcb9ea1b556$export$95185d699e05d4d7.isOpening = setOpening, $7215afc6de606d6b$export$de79e2c695e052f3(target), target.dispatchEvent(event), $ea8dcbcb9ea1b556$export$95185d699e05d4d7.isOpening = !1;
}
$ea8dcbcb9ea1b556$export$95185d699e05d4d7.isOpening = !1;
function $ea8dcbcb9ea1b556$var$getSyntheticLink(target, open) {
  if (target instanceof HTMLAnchorElement) open(target);
  else if (target.hasAttribute("data-href")) {
    let link = document.createElement("a");
    link.href = target.getAttribute("data-href"), target.hasAttribute("data-target") && (link.target = target.getAttribute("data-target")), target.hasAttribute("data-rel") && (link.rel = target.getAttribute("data-rel")), target.hasAttribute("data-download") && (link.download = target.getAttribute("data-download")), target.hasAttribute("data-ping") && (link.ping = target.getAttribute("data-ping")), target.hasAttribute("data-referrer-policy") && (link.referrerPolicy = target.getAttribute("data-referrer-policy")), target.appendChild(link), open(link), target.removeChild(link);
  }
}
function $ea8dcbcb9ea1b556$var$openSyntheticLink(target, modifiers) {
  $ea8dcbcb9ea1b556$var$getSyntheticLink(target, (link) => $ea8dcbcb9ea1b556$export$95185d699e05d4d7(link, modifiers));
}
function $ea8dcbcb9ea1b556$export$7e924b3091a3bd18(props) {
  let router = $ea8dcbcb9ea1b556$export$9a302a45f65d0572();
  var _props_href;
  let href = router.useHref((_props_href = props?.href) !== null && _props_href !== void 0 ? _props_href : "");
  return {
    href: props?.href ? href : void 0,
    target: props?.target,
    rel: props?.rel,
    download: props?.download,
    ping: props?.ping,
    referrerPolicy: props?.referrerPolicy
  };
}
function $ea8dcbcb9ea1b556$export$13aea1a3cb5e3f1f(e, router, href, routerOptions) {
  !router.isNative && e.currentTarget instanceof HTMLAnchorElement && e.currentTarget.href && // If props are applied to a router Link component, it may have already prevented default.
  !e.isDefaultPrevented() && $ea8dcbcb9ea1b556$export$efa8c9099e530235(e.currentTarget, e) && href && (e.preventDefault(), router.open(e.currentTarget, e, href, routerOptions));
}

// ../node_modules/@react-aria/utils/dist/runAfterTransition.mjs
var $bbed8b41f857bcc0$var$transitionsByElement = /* @__PURE__ */ new Map(), $bbed8b41f857bcc0$var$transitionCallbacks = /* @__PURE__ */ new Set();
function $bbed8b41f857bcc0$var$setupGlobalEvents() {
  if (typeof window > "u") return;
  function isTransitionEvent(event) {
    return "propertyName" in event;
  }
  let onTransitionStart = (e) => {
    if (!isTransitionEvent(e) || !e.target) return;
    let transitions = $bbed8b41f857bcc0$var$transitionsByElement.get(e.target);
    transitions || (transitions = /* @__PURE__ */ new Set(), $bbed8b41f857bcc0$var$transitionsByElement.set(e.target, transitions), e.target.addEventListener("transitioncancel", onTransitionEnd, {
      once: !0
    })), transitions.add(e.propertyName);
  }, onTransitionEnd = (e) => {
    if (!isTransitionEvent(e) || !e.target) return;
    let properties = $bbed8b41f857bcc0$var$transitionsByElement.get(e.target);
    if (properties && (properties.delete(e.propertyName), properties.size === 0 && (e.target.removeEventListener("transitioncancel", onTransitionEnd), $bbed8b41f857bcc0$var$transitionsByElement.delete(e.target)), $bbed8b41f857bcc0$var$transitionsByElement.size === 0)) {
      for (let cb of $bbed8b41f857bcc0$var$transitionCallbacks) cb();
      $bbed8b41f857bcc0$var$transitionCallbacks.clear();
    }
  };
  document.body.addEventListener("transitionrun", onTransitionStart), document.body.addEventListener("transitionend", onTransitionEnd);
}
typeof document < "u" && (document.readyState !== "loading" ? $bbed8b41f857bcc0$var$setupGlobalEvents() : document.addEventListener("DOMContentLoaded", $bbed8b41f857bcc0$var$setupGlobalEvents));
function $bbed8b41f857bcc0$var$cleanupDetachedElements() {
  for (let [eventTarget] of $bbed8b41f857bcc0$var$transitionsByElement)
    "isConnected" in eventTarget && !eventTarget.isConnected && $bbed8b41f857bcc0$var$transitionsByElement.delete(eventTarget);
}
function $bbed8b41f857bcc0$export$24490316f764c430(fn) {
  requestAnimationFrame(() => {
    $bbed8b41f857bcc0$var$cleanupDetachedElements(), $bbed8b41f857bcc0$var$transitionsByElement.size === 0 ? fn() : $bbed8b41f857bcc0$var$transitionCallbacks.add(fn);
  });
}

// ../node_modules/@react-aria/utils/dist/useDrag1D.mjs
import { useRef as $1rnCS$useRef } from "react";

// ../node_modules/@react-aria/utils/dist/useGlobalListeners.mjs
import { useRef as $lPAwt$useRef, useCallback as $lPAwt$useCallback, useEffect as $lPAwt$useEffect } from "react";
function $03deb23ff14920c4$export$4eaf04e54aa8eed6() {
  let globalListeners = $lPAwt$useRef(/* @__PURE__ */ new Map()), addGlobalListener = $lPAwt$useCallback((eventTarget, type, listener, options) => {
    let fn = options?.once ? (...args) => {
      globalListeners.current.delete(listener), listener(...args);
    } : listener;
    globalListeners.current.set(listener, {
      type,
      eventTarget,
      fn,
      options
    }), eventTarget.addEventListener(type, fn, options);
  }, []), removeGlobalListener = $lPAwt$useCallback((eventTarget, type, listener, options) => {
    var _globalListeners_current_get;
    let fn = ((_globalListeners_current_get = globalListeners.current.get(listener)) === null || _globalListeners_current_get === void 0 ? void 0 : _globalListeners_current_get.fn) || listener;
    eventTarget.removeEventListener(type, fn, options), globalListeners.current.delete(listener);
  }, []), removeAllGlobalListeners = $lPAwt$useCallback(() => {
    globalListeners.current.forEach((value, key) => {
      removeGlobalListener(value.eventTarget, value.type, key, value.options);
    });
  }, [
    removeGlobalListener
  ]);
  return $lPAwt$useEffect(() => removeAllGlobalListeners, [
    removeAllGlobalListeners
  ]), {
    addGlobalListener,
    removeGlobalListener,
    removeAllGlobalListeners
  };
}

// ../node_modules/@react-aria/utils/dist/useLabels.mjs
function $313b98861ee5dd6c$export$d6875122194c7b44(props, defaultLabel) {
  let { id, "aria-label": label, "aria-labelledby": labelledBy } = props;
  return id = $bdb11010cef70236$export$f680877a34711e37(id), labelledBy && label ? labelledBy = [
    .../* @__PURE__ */ new Set([
      id,
      ...labelledBy.trim().split(/\s+/)
    ])
  ].join(" ") : labelledBy && (labelledBy = labelledBy.trim().split(/\s+/).join(" ")), !label && !labelledBy && defaultLabel && (label = defaultLabel), {
    id,
    "aria-label": label,
    "aria-labelledby": labelledBy
  };
}

// ../node_modules/@react-aria/utils/dist/useObjectRef.mjs
import { useRef as $gbmns$useRef, useCallback as $gbmns$useCallback, useMemo as $gbmns$useMemo } from "react";
function $df56164dff5785e2$export$4338b53315abf666(ref) {
  let objRef = $gbmns$useRef(null), cleanupRef = $gbmns$useRef(void 0), refEffect = $gbmns$useCallback((instance) => {
    if (typeof ref == "function") {
      let refCallback = ref, refCleanup = refCallback(instance);
      return () => {
        typeof refCleanup == "function" ? refCleanup() : refCallback(null);
      };
    } else if (ref)
      return ref.current = instance, () => {
        ref.current = null;
      };
  }, [
    ref
  ]);
  return $gbmns$useMemo(() => ({
    get current() {
      return objRef.current;
    },
    set current(value) {
      objRef.current = value, cleanupRef.current && (cleanupRef.current(), cleanupRef.current = void 0), value != null && (cleanupRef.current = refEffect(value));
    }
  }), [
    refEffect
  ]);
}

// ../node_modules/@react-aria/utils/dist/useUpdateEffect.mjs
import { useRef as $9vW05$useRef, useEffect as $9vW05$useEffect } from "react";

// ../node_modules/@react-aria/utils/dist/useUpdateLayoutEffect.mjs
import { useRef as $azsE2$useRef } from "react";
function $ca9b37712f007381$export$72ef708ab07251f1(effect, dependencies) {
  let isInitialMount = $azsE2$useRef(!0), lastDeps = $azsE2$useRef(null);
  $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => (isInitialMount.current = !0, () => {
    isInitialMount.current = !1;
  }), []), $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => {
    isInitialMount.current ? isInitialMount.current = !1 : (!lastDeps.current || dependencies.some((dep, i) => !Object.is(dep, lastDeps[i]))) && effect(), lastDeps.current = dependencies;
  }, dependencies);
}

// ../node_modules/@react-aria/utils/dist/useResizeObserver.mjs
import { useEffect as $Vsl8o$useEffect } from "react";
function $9daab02d461809db$var$hasResizeObserver() {
  return typeof window.ResizeObserver < "u";
}
function $9daab02d461809db$export$683480f191c0e3ea(options) {
  let { ref, box, onResize } = options;
  $Vsl8o$useEffect(() => {
    let element = ref?.current;
    if (element)
      if ($9daab02d461809db$var$hasResizeObserver()) {
        let resizeObserverInstance = new window.ResizeObserver((entries) => {
          entries.length && onResize();
        });
        return resizeObserverInstance.observe(element, {
          box
        }), () => {
          element && resizeObserverInstance.unobserve(element);
        };
      } else
        return window.addEventListener("resize", onResize, !1), () => {
          window.removeEventListener("resize", onResize, !1);
        };
  }, [
    onResize,
    ref,
    box
  ]);
}

// ../node_modules/@react-aria/utils/dist/useSyncRef.mjs
function $e7801be82b4b2a53$export$4debdb1a3f0fa79e(context, ref) {
  $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => {
    if (context && context.ref && ref)
      return context.ref.current = ref.current, () => {
        context.ref && (context.ref.current = null);
      };
  });
}

// ../node_modules/@react-aria/utils/dist/isScrollable.mjs
function $cc38e7bd3fc7b213$export$2bb74740c4e19def(node, checkForOverflow) {
  if (!node) return !1;
  let style = window.getComputedStyle(node), isScrollable = /(auto|scroll)/.test(style.overflow + style.overflowX + style.overflowY);
  return isScrollable && checkForOverflow && (isScrollable = node.scrollHeight !== node.clientHeight || node.scrollWidth !== node.clientWidth), isScrollable;
}

// ../node_modules/@react-aria/utils/dist/getScrollParent.mjs
function $62d8ded9296f3872$export$cfa2225e87938781(node, checkForOverflow) {
  let scrollableNode = node;
  for ($cc38e7bd3fc7b213$export$2bb74740c4e19def(scrollableNode, checkForOverflow) && (scrollableNode = scrollableNode.parentElement); scrollableNode && !$cc38e7bd3fc7b213$export$2bb74740c4e19def(scrollableNode, checkForOverflow); ) scrollableNode = scrollableNode.parentElement;
  return scrollableNode || document.scrollingElement || document.documentElement;
}

// ../node_modules/@react-aria/utils/dist/getScrollParents.mjs
function $a40c673dc9f6d9c7$export$94ed1c92c7beeb22(node, checkForOverflow) {
  let scrollParents = [];
  for (; node && node !== document.documentElement; )
    $cc38e7bd3fc7b213$export$2bb74740c4e19def(node, checkForOverflow) && scrollParents.push(node), node = node.parentElement;
  return scrollParents;
}

// ../node_modules/@react-aria/utils/dist/keyboard.mjs
function $21f1aa98acb08317$export$16792effe837dba3(e) {
  return $c87311424ea30a05$export$9ac100e40613ea10() ? e.metaKey : e.ctrlKey;
}
var $21f1aa98acb08317$var$nonTextInputTypes = /* @__PURE__ */ new Set([
  "checkbox",
  "radio",
  "range",
  "color",
  "file",
  "image",
  "button",
  "submit",
  "reset"
]);
function $21f1aa98acb08317$export$c57958e35f31ed73(target) {
  return target instanceof HTMLInputElement && !$21f1aa98acb08317$var$nonTextInputTypes.has(target.type) || target instanceof HTMLTextAreaElement || target instanceof HTMLElement && target.isContentEditable;
}

// ../node_modules/@react-aria/utils/dist/useViewportSize.mjs
import { useState as $fuDHA$useState, useEffect as $fuDHA$useEffect } from "react";
var $5df64b3807dc15ee$var$visualViewport = typeof document < "u" && window.visualViewport;

// ../node_modules/@react-aria/utils/dist/useDescription.mjs
import { useState as $hQ5Hp$useState } from "react";
var $ef06256079686ba0$var$descriptionId = 0, $ef06256079686ba0$var$descriptionNodes = /* @__PURE__ */ new Map();
function $ef06256079686ba0$export$f8aeda7b10753fa1(description) {
  let [id, setId] = $hQ5Hp$useState();
  return $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => {
    if (!description) return;
    let desc = $ef06256079686ba0$var$descriptionNodes.get(description);
    if (desc)
      setId(desc.element.id);
    else {
      let id2 = `react-aria-description-${$ef06256079686ba0$var$descriptionId++}`;
      setId(id2);
      let node = document.createElement("div");
      node.id = id2, node.style.display = "none", node.textContent = description, document.body.appendChild(node), desc = {
        refCount: 0,
        element: node
      }, $ef06256079686ba0$var$descriptionNodes.set(description, desc);
    }
    return desc.refCount++, () => {
      desc && --desc.refCount === 0 && (desc.element.remove(), $ef06256079686ba0$var$descriptionNodes.delete(description));
    };
  }, [
    description
  ]), {
    "aria-describedby": description ? id : void 0
  };
}

// ../node_modules/@react-aria/utils/dist/useEvent.mjs
import { useEffect as $ceQd6$useEffect } from "react";
function $e9faafb641e167db$export$90fc3a17d93f704c(ref, event, handler, options) {
  let handleEvent = $8ae05eaa5c114e9c$export$7f54fc3180508a52(handler), isDisabled = handler == null;
  $ceQd6$useEffect(() => {
    if (isDisabled || !ref.current) return;
    let element = ref.current;
    return element.addEventListener(event, handleEvent, options), () => {
      element.removeEventListener(event, handleEvent, options);
    };
  }, [
    ref,
    event,
    options,
    isDisabled,
    handleEvent
  ]);
}

// ../node_modules/@react-aria/utils/dist/scrollIntoView.mjs
function $2f04cbc44ee30ce0$export$53a0910f038337bd(scrollView, element) {
  let offsetX = $2f04cbc44ee30ce0$var$relativeOffset(scrollView, element, "left"), offsetY = $2f04cbc44ee30ce0$var$relativeOffset(scrollView, element, "top"), width = element.offsetWidth, height = element.offsetHeight, x = scrollView.scrollLeft, y = scrollView.scrollTop, { borderTopWidth, borderLeftWidth, scrollPaddingTop, scrollPaddingRight, scrollPaddingBottom, scrollPaddingLeft } = getComputedStyle(scrollView), { scrollMarginTop, scrollMarginRight, scrollMarginBottom, scrollMarginLeft } = getComputedStyle(element), borderAdjustedX = x + parseInt(borderLeftWidth, 10), borderAdjustedY = y + parseInt(borderTopWidth, 10), maxX = borderAdjustedX + scrollView.clientWidth, maxY = borderAdjustedY + scrollView.clientHeight, scrollPaddingTopNumber = parseInt(scrollPaddingTop, 10) || 0, scrollPaddingBottomNumber = parseInt(scrollPaddingBottom, 10) || 0, scrollPaddingRightNumber = parseInt(scrollPaddingRight, 10) || 0, scrollPaddingLeftNumber = parseInt(scrollPaddingLeft, 10) || 0, scrollMarginTopNumber = parseInt(scrollMarginTop, 10) || 0, scrollMarginBottomNumber = parseInt(scrollMarginBottom, 10) || 0, scrollMarginRightNumber = parseInt(scrollMarginRight, 10) || 0, scrollMarginLeftNumber = parseInt(scrollMarginLeft, 10) || 0, targetLeft = offsetX - scrollMarginLeftNumber, targetRight = offsetX + width + scrollMarginRightNumber, targetTop = offsetY - scrollMarginTopNumber, targetBottom = offsetY + height + scrollMarginBottomNumber, scrollPortLeft = x + parseInt(borderLeftWidth, 10) + scrollPaddingLeftNumber, scrollPortRight = maxX - scrollPaddingRightNumber, scrollPortTop = y + parseInt(borderTopWidth, 10) + scrollPaddingTopNumber, scrollPortBottom = maxY - scrollPaddingBottomNumber;
  if ((targetLeft > scrollPortLeft || targetRight < scrollPortRight) && (targetLeft <= x + scrollPaddingLeftNumber ? x = targetLeft - parseInt(borderLeftWidth, 10) - scrollPaddingLeftNumber : targetRight > maxX - scrollPaddingRightNumber && (x += targetRight - maxX + scrollPaddingRightNumber)), (targetTop > scrollPortTop || targetBottom < scrollPortBottom) && (targetTop <= borderAdjustedY + scrollPaddingTopNumber ? y = targetTop - parseInt(borderTopWidth, 10) - scrollPaddingTopNumber : targetBottom > maxY - scrollPaddingBottomNumber && (y += targetBottom - maxY + scrollPaddingBottomNumber)), process.env.NODE_ENV === "test") {
    scrollView.scrollLeft = x, scrollView.scrollTop = y;
    return;
  }
  scrollView.scrollTo({
    left: x,
    top: y
  });
}
function $2f04cbc44ee30ce0$var$relativeOffset(ancestor, child, axis) {
  let prop = axis === "left" ? "offsetLeft" : "offsetTop", sum = 0;
  for (; child.offsetParent && (sum += child[prop], child.offsetParent !== ancestor); ) {
    if (child.offsetParent.contains(ancestor)) {
      sum -= ancestor[prop];
      break;
    }
    child = child.offsetParent;
  }
  return sum;
}
function $2f04cbc44ee30ce0$export$c826860796309d1b(targetElement, opts) {
  if (targetElement && document.contains(targetElement)) {
    let root = document.scrollingElement || document.documentElement;
    if (!(window.getComputedStyle(root).overflow === "hidden") && !$c87311424ea30a05$export$6446a186d09e379e()) {
      var _targetElement_scrollIntoView;
      let { left: originalLeft, top: originalTop } = targetElement.getBoundingClientRect();
      targetElement == null || (_targetElement_scrollIntoView = targetElement.scrollIntoView) === null || _targetElement_scrollIntoView === void 0 || _targetElement_scrollIntoView.call(targetElement, {
        block: "nearest"
      });
      let { left: newLeft, top: newTop } = targetElement.getBoundingClientRect();
      if (Math.abs(originalLeft - newLeft) > 1 || Math.abs(originalTop - newTop) > 1) {
        var _opts_containingElement_scrollIntoView, _opts_containingElement, _targetElement_scrollIntoView1;
        opts == null || (_opts_containingElement = opts.containingElement) === null || _opts_containingElement === void 0 || (_opts_containingElement_scrollIntoView = _opts_containingElement.scrollIntoView) === null || _opts_containingElement_scrollIntoView === void 0 || _opts_containingElement_scrollIntoView.call(_opts_containingElement, {
          block: "center",
          inline: "center"
        }), (_targetElement_scrollIntoView1 = targetElement.scrollIntoView) === null || _targetElement_scrollIntoView1 === void 0 || _targetElement_scrollIntoView1.call(targetElement, {
          block: "nearest"
        });
      }
    } else {
      let scrollParents = $a40c673dc9f6d9c7$export$94ed1c92c7beeb22(targetElement);
      for (let scrollParent of scrollParents) $2f04cbc44ee30ce0$export$53a0910f038337bd(scrollParent, targetElement);
    }
  }
}

// ../node_modules/@react-aria/utils/dist/isVirtualEvent.mjs
function $6a7db85432448f7f$export$60278871457622de(event) {
  return event.pointerType === "" && event.isTrusted ? !0 : $c87311424ea30a05$export$a11b0059900ceec8() && event.pointerType ? event.type === "click" && event.buttons === 1 : event.detail === 0 && !event.pointerType;
}
function $6a7db85432448f7f$export$29bf1b5f2c56cf63(event) {
  return !$c87311424ea30a05$export$a11b0059900ceec8() && event.width === 0 && event.height === 0 || event.width === 1 && event.height === 1 && event.pressure === 0 && event.detail === 0 && event.pointerType === "mouse";
}

// ../node_modules/@react-aria/utils/dist/useDeepMemo.mjs
import { useRef as $jtQ6z$useRef } from "react";

// ../node_modules/@react-aria/utils/dist/useFormReset.mjs
import { useEffect as $8rM3G$useEffect } from "react";

// ../node_modules/@react-aria/utils/dist/useLoadMore.mjs
import { useRef as $hDRkU$useRef, useCallback as $hDRkU$useCallback } from "react";

// ../node_modules/@react-aria/utils/dist/useLoadMoreSentinel.mjs
import { useRef as $7FoZl$useRef } from "react";

// ../node_modules/@react-aria/utils/dist/inertValue.mjs
import { version as $iulvE$version } from "react";
function $cdc5a6778b766db2$export$a9d04c5684123369(value) {
  let pieces = $iulvE$version.split(".");
  return parseInt(pieces[0], 10) >= 19 ? value : value ? "true" : void 0;
}

// ../node_modules/@react-aria/utils/dist/constants.mjs
var $5671b20cf9b562b2$export$447a38995de2c711 = "react-aria-clear-focus", $5671b20cf9b562b2$export$831c820ad60f9d12 = "react-aria-focus";

// ../node_modules/@react-aria/utils/dist/animation.mjs
import { flushSync as $jJMAe$flushSync } from "react-dom";
import { useState as $jJMAe$useState, useCallback as $jJMAe$useCallback } from "react";
function $d3f049242431219c$export$6d3443f2c48bfc20(ref, isReady = !0) {
  let [isEntering, setEntering] = $jJMAe$useState(!0), isAnimationReady = isEntering && isReady;
  return $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => {
    if (isAnimationReady && ref.current && "getAnimations" in ref.current)
      for (let animation of ref.current.getAnimations()) animation instanceof CSSTransition && animation.cancel();
  }, [
    ref,
    isAnimationReady
  ]), $d3f049242431219c$var$useAnimation(ref, isAnimationReady, $jJMAe$useCallback(() => setEntering(!1), [])), isAnimationReady;
}
function $d3f049242431219c$export$45fda7c47f93fd48(ref, isOpen) {
  let [exitState, setExitState] = $jJMAe$useState(isOpen ? "open" : "closed");
  switch (exitState) {
    case "open":
      isOpen || setExitState("exiting");
      break;
    case "closed":
    case "exiting":
      isOpen && setExitState("open");
      break;
  }
  let isExiting = exitState === "exiting";
  return $d3f049242431219c$var$useAnimation(ref, isExiting, $jJMAe$useCallback(() => {
    setExitState((state) => state === "exiting" ? "closed" : state);
  }, [])), isExiting;
}
function $d3f049242431219c$var$useAnimation(ref, isActive, onEnd) {
  $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => {
    if (isActive && ref.current) {
      if (!("getAnimations" in ref.current)) {
        onEnd();
        return;
      }
      let animations = ref.current.getAnimations();
      if (animations.length === 0) {
        onEnd();
        return;
      }
      let canceled = !1;
      return Promise.all(animations.map((a) => a.finished)).then(() => {
        canceled || $jJMAe$flushSync(() => {
          onEnd();
        });
      }).catch(() => {
      }), () => {
        canceled = !0;
      };
    }
  }, [
    ref,
    isActive,
    onEnd
  ]);
}

// ../node_modules/@react-aria/utils/dist/isElementVisible.mjs
var $7d2416ea0959daaa$var$supportsCheckVisibility = typeof Element < "u" && "checkVisibility" in Element.prototype;
function $7d2416ea0959daaa$var$isStyleVisible(element) {
  let windowObject = $431fbd86ca7dc216$export$f21a1ffae260145a(element);
  if (!(element instanceof windowObject.HTMLElement) && !(element instanceof windowObject.SVGElement)) return !1;
  let { display, visibility } = element.style, isVisible = display !== "none" && visibility !== "hidden" && visibility !== "collapse";
  if (isVisible) {
    let { getComputedStyle: getComputedStyle2 } = element.ownerDocument.defaultView, { display: computedDisplay, visibility: computedVisibility } = getComputedStyle2(element);
    isVisible = computedDisplay !== "none" && computedVisibility !== "hidden" && computedVisibility !== "collapse";
  }
  return isVisible;
}
function $7d2416ea0959daaa$var$isAttributeVisible(element, childElement) {
  return !element.hasAttribute("hidden") && // Ignore HiddenSelect when tree walking.
  !element.hasAttribute("data-react-aria-prevent-focus") && (element.nodeName === "DETAILS" && childElement && childElement.nodeName !== "SUMMARY" ? element.hasAttribute("open") : !0);
}
function $7d2416ea0959daaa$export$e989c0fffaa6b27a(element, childElement) {
  return $7d2416ea0959daaa$var$supportsCheckVisibility ? element.checkVisibility({
    visibilityProperty: !0
  }) && !element.closest("[data-react-aria-prevent-focus]") : element.nodeName !== "#comment" && $7d2416ea0959daaa$var$isStyleVisible(element) && $7d2416ea0959daaa$var$isAttributeVisible(element, childElement) && (!element.parentElement || $7d2416ea0959daaa$export$e989c0fffaa6b27a(element.parentElement, element));
}

// ../node_modules/@react-aria/utils/dist/isFocusable.mjs
var $b4b717babfbb907b$var$focusableElements = [
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "a[href]",
  "area[href]",
  "summary",
  "iframe",
  "object",
  "embed",
  "audio[controls]",
  "video[controls]",
  '[contenteditable]:not([contenteditable^="false"])',
  "permission"
], $b4b717babfbb907b$var$FOCUSABLE_ELEMENT_SELECTOR = $b4b717babfbb907b$var$focusableElements.join(":not([hidden]),") + ",[tabindex]:not([disabled]):not([hidden])";
$b4b717babfbb907b$var$focusableElements.push('[tabindex]:not([tabindex="-1"]):not([disabled])');
var $b4b717babfbb907b$var$TABBABLE_ELEMENT_SELECTOR = $b4b717babfbb907b$var$focusableElements.join(':not([hidden]):not([tabindex="-1"]),');
function $b4b717babfbb907b$export$4c063cf1350e6fed(element) {
  return element.matches($b4b717babfbb907b$var$FOCUSABLE_ELEMENT_SELECTOR) && $7d2416ea0959daaa$export$e989c0fffaa6b27a(element) && !$b4b717babfbb907b$var$isInert(element);
}
function $b4b717babfbb907b$export$bebd5a1431fec25d(element) {
  return element.matches($b4b717babfbb907b$var$TABBABLE_ELEMENT_SELECTOR) && $7d2416ea0959daaa$export$e989c0fffaa6b27a(element) && !$b4b717babfbb907b$var$isInert(element);
}
function $b4b717babfbb907b$var$isInert(element) {
  let node = element;
  for (; node != null; ) {
    if (node instanceof node.ownerDocument.defaultView.HTMLElement && node.inert) return !0;
    node = node.parentElement;
  }
  return !1;
}

// ../node_modules/@react-stately/utils/dist/useControlledState.mjs
import { useState as $3whtM$useState, useRef as $3whtM$useRef, useEffect as $3whtM$useEffect, useCallback as $3whtM$useCallback } from "react";
function $458b0a5536c1a7cf$export$40bfa8c7b0832715(value, defaultValue, onChange) {
  let [stateValue, setStateValue] = $3whtM$useState(value || defaultValue), isControlledRef = $3whtM$useRef(value !== void 0), isControlled = value !== void 0;
  $3whtM$useEffect(() => {
    let wasControlled = isControlledRef.current;
    wasControlled !== isControlled && process.env.NODE_ENV !== "production" && console.warn(`WARN: A component changed from ${wasControlled ? "controlled" : "uncontrolled"} to ${isControlled ? "controlled" : "uncontrolled"}.`), isControlledRef.current = isControlled;
  }, [
    isControlled
  ]);
  let currentValue = isControlled ? value : stateValue, setValue = $3whtM$useCallback((value2, ...args) => {
    let onChangeCaller = (value3, ...onChangeArgs) => {
      onChange && (Object.is(currentValue, value3) || onChange(value3, ...onChangeArgs)), isControlled || (currentValue = value3);
    };
    typeof value2 == "function" ? (process.env.NODE_ENV !== "production" && console.warn("We can not support a function callback. See Github Issues for details https://github.com/adobe/react-spectrum/issues/2320"), setStateValue((oldValue, ...functionArgs) => {
      let interceptedValue = value2(isControlled ? currentValue : oldValue, ...functionArgs);
      return onChangeCaller(interceptedValue, ...args), isControlled ? oldValue : interceptedValue;
    })) : (isControlled || setStateValue(value2), onChangeCaller(value2, ...args));
  }, [
    isControlled,
    currentValue,
    onChange
  ]);
  return [
    currentValue,
    setValue
  ];
}

// ../node_modules/@react-stately/utils/dist/number.mjs
function $9446cca9a3875146$export$7d15b64cf5a3a4c4(value, min = -1 / 0, max = 1 / 0) {
  return Math.min(Math.max(value, min), max);
}

// ../node_modules/@react-aria/interactions/dist/utils.mjs
import { useRef as $6dfIe$useRef, useCallback as $6dfIe$useCallback } from "react";
function $8a9cb279dc87e130$export$525bc4921d56d4a(nativeEvent) {
  let event = nativeEvent;
  return event.nativeEvent = nativeEvent, event.isDefaultPrevented = () => event.defaultPrevented, event.isPropagationStopped = () => event.cancelBubble, event.persist = () => {
  }, event;
}
function $8a9cb279dc87e130$export$c2b7abe5d61ec696(event, target) {
  Object.defineProperty(event, "target", {
    value: target
  }), Object.defineProperty(event, "currentTarget", {
    value: target
  });
}
function $8a9cb279dc87e130$export$715c682d09d639cc(onBlur) {
  let stateRef = $6dfIe$useRef({
    isFocused: !1,
    observer: null
  });
  $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => {
    let state = stateRef.current;
    return () => {
      state.observer && (state.observer.disconnect(), state.observer = null);
    };
  }, []);
  let dispatchBlur = $8ae05eaa5c114e9c$export$7f54fc3180508a52((e) => {
    onBlur?.(e);
  });
  return $6dfIe$useCallback((e) => {
    if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
      stateRef.current.isFocused = !0;
      let target = e.target, onBlurHandler = (e2) => {
        if (stateRef.current.isFocused = !1, target.disabled) {
          let event = $8a9cb279dc87e130$export$525bc4921d56d4a(e2);
          dispatchBlur(event);
        }
        stateRef.current.observer && (stateRef.current.observer.disconnect(), stateRef.current.observer = null);
      };
      target.addEventListener("focusout", onBlurHandler, {
        once: !0
      }), stateRef.current.observer = new MutationObserver(() => {
        if (stateRef.current.isFocused && target.disabled) {
          var _stateRef_current_observer;
          (_stateRef_current_observer = stateRef.current.observer) === null || _stateRef_current_observer === void 0 || _stateRef_current_observer.disconnect();
          let relatedTargetEl = target === document.activeElement ? null : document.activeElement;
          target.dispatchEvent(new FocusEvent("blur", {
            relatedTarget: relatedTargetEl
          })), target.dispatchEvent(new FocusEvent("focusout", {
            bubbles: !0,
            relatedTarget: relatedTargetEl
          }));
        }
      }), stateRef.current.observer.observe(target, {
        attributes: !0,
        attributeFilter: [
          "disabled"
        ]
      });
    }
  }, [
    dispatchBlur
  ]);
}
var $8a9cb279dc87e130$export$fda7da73ab5d4c48 = !1;
function $8a9cb279dc87e130$export$cabe61c495ee3649(target) {
  for (; target && !$b4b717babfbb907b$export$4c063cf1350e6fed(target); ) target = target.parentElement;
  let window2 = $431fbd86ca7dc216$export$f21a1ffae260145a(target), activeElement = window2.document.activeElement;
  if (!activeElement || activeElement === target) return;
  $8a9cb279dc87e130$export$fda7da73ab5d4c48 = !0;
  let isRefocusing = !1, onBlur = (e) => {
    (e.target === activeElement || isRefocusing) && e.stopImmediatePropagation();
  }, onFocusOut = (e) => {
    (e.target === activeElement || isRefocusing) && (e.stopImmediatePropagation(), !target && !isRefocusing && (isRefocusing = !0, $7215afc6de606d6b$export$de79e2c695e052f3(activeElement), cleanup()));
  }, onFocus = (e) => {
    (e.target === target || isRefocusing) && e.stopImmediatePropagation();
  }, onFocusIn = (e) => {
    (e.target === target || isRefocusing) && (e.stopImmediatePropagation(), isRefocusing || (isRefocusing = !0, $7215afc6de606d6b$export$de79e2c695e052f3(activeElement), cleanup()));
  };
  window2.addEventListener("blur", onBlur, !0), window2.addEventListener("focusout", onFocusOut, !0), window2.addEventListener("focusin", onFocusIn, !0), window2.addEventListener("focus", onFocus, !0);
  let cleanup = () => {
    cancelAnimationFrame(raf), window2.removeEventListener("blur", onBlur, !0), window2.removeEventListener("focusout", onFocusOut, !0), window2.removeEventListener("focusin", onFocusIn, !0), window2.removeEventListener("focus", onFocus, !0), $8a9cb279dc87e130$export$fda7da73ab5d4c48 = !1, isRefocusing = !1;
  }, raf = requestAnimationFrame(cleanup);
  return cleanup;
}

// ../node_modules/@react-aria/interactions/dist/textSelection.mjs
var $14c0b72509d70225$var$state = "default", $14c0b72509d70225$var$savedUserSelect = "", $14c0b72509d70225$var$modifiedElementMap = /* @__PURE__ */ new WeakMap();
function $14c0b72509d70225$export$16a4697467175487(target) {
  if ($c87311424ea30a05$export$fedb369cb70207f1()) {
    if ($14c0b72509d70225$var$state === "default") {
      let documentObject = $431fbd86ca7dc216$export$b204af158042fbac(target);
      $14c0b72509d70225$var$savedUserSelect = documentObject.documentElement.style.webkitUserSelect, documentObject.documentElement.style.webkitUserSelect = "none";
    }
    $14c0b72509d70225$var$state = "disabled";
  } else if (target instanceof HTMLElement || target instanceof SVGElement) {
    let property = "userSelect" in target.style ? "userSelect" : "webkitUserSelect";
    $14c0b72509d70225$var$modifiedElementMap.set(target, target.style[property]), target.style[property] = "none";
  }
}
function $14c0b72509d70225$export$b0d6fa1ab32e3295(target) {
  if ($c87311424ea30a05$export$fedb369cb70207f1()) {
    if ($14c0b72509d70225$var$state !== "disabled") return;
    $14c0b72509d70225$var$state = "restoring", setTimeout(() => {
      $bbed8b41f857bcc0$export$24490316f764c430(() => {
        if ($14c0b72509d70225$var$state === "restoring") {
          let documentObject = $431fbd86ca7dc216$export$b204af158042fbac(target);
          documentObject.documentElement.style.webkitUserSelect === "none" && (documentObject.documentElement.style.webkitUserSelect = $14c0b72509d70225$var$savedUserSelect || ""), $14c0b72509d70225$var$savedUserSelect = "", $14c0b72509d70225$var$state = "default";
        }
      });
    }, 300);
  } else if ((target instanceof HTMLElement || target instanceof SVGElement) && target && $14c0b72509d70225$var$modifiedElementMap.has(target)) {
    let targetOldUserSelect = $14c0b72509d70225$var$modifiedElementMap.get(target), property = "userSelect" in target.style ? "userSelect" : "webkitUserSelect";
    target.style[property] === "none" && (target.style[property] = targetOldUserSelect), target.getAttribute("style") === "" && target.removeAttribute("style"), $14c0b72509d70225$var$modifiedElementMap.delete(target);
  }
}

// ../node_modules/@react-aria/interactions/dist/context.mjs
import $3aeG1$react from "react";
var $ae1eeba8b9eafd08$export$5165eccb35aaadb5 = $3aeG1$react.createContext({
  register: () => {
  }
});
$ae1eeba8b9eafd08$export$5165eccb35aaadb5.displayName = "PressResponderContext";

// ../node_modules/@swc/helpers/esm/_class_apply_descriptor_get.js
function _class_apply_descriptor_get(receiver, descriptor) {
  return descriptor.get ? descriptor.get.call(receiver) : descriptor.value;
}

// ../node_modules/@swc/helpers/esm/_class_extract_field_descriptor.js
function _class_extract_field_descriptor(receiver, privateMap, action) {
  if (!privateMap.has(receiver)) throw new TypeError("attempted to " + action + " private field on non-instance");
  return privateMap.get(receiver);
}

// ../node_modules/@swc/helpers/esm/_class_private_field_get.js
function _class_private_field_get(receiver, privateMap) {
  var descriptor = _class_extract_field_descriptor(receiver, privateMap, "get");
  return _class_apply_descriptor_get(receiver, descriptor);
}

// ../node_modules/@swc/helpers/esm/_check_private_redeclaration.js
function _check_private_redeclaration(obj, privateCollection) {
  if (privateCollection.has(obj))
    throw new TypeError("Cannot initialize the same private elements twice on an object");
}

// ../node_modules/@swc/helpers/esm/_class_private_field_init.js
function _class_private_field_init(obj, privateMap, value) {
  _check_private_redeclaration(obj, privateMap), privateMap.set(obj, value);
}

// ../node_modules/@swc/helpers/esm/_class_apply_descriptor_set.js
function _class_apply_descriptor_set(receiver, descriptor, value) {
  if (descriptor.set) descriptor.set.call(receiver, value);
  else {
    if (!descriptor.writable)
      throw new TypeError("attempted to set read only private field");
    descriptor.value = value;
  }
}

// ../node_modules/@swc/helpers/esm/_class_private_field_set.js
function _class_private_field_set(receiver, privateMap, value) {
  var descriptor = _class_extract_field_descriptor(receiver, privateMap, "set");
  return _class_apply_descriptor_set(receiver, descriptor, value), value;
}

// ../node_modules/@react-aria/interactions/dist/usePress.mjs
import { flushSync as $7mdmh$flushSync } from "react-dom";
import { useContext as $7mdmh$useContext, useState as $7mdmh$useState, useRef as $7mdmh$useRef, useMemo as $7mdmh$useMemo, useEffect as $7mdmh$useEffect } from "react";
function $f6c31cce2adf654f$var$usePressResponderContext(props) {
  let context = $7mdmh$useContext($ae1eeba8b9eafd08$export$5165eccb35aaadb5);
  if (context) {
    let { register, ...contextProps } = context;
    props = $3ef42575df84b30b$export$9d1611c77c2fe928(contextProps, props), register();
  }
  return $e7801be82b4b2a53$export$4debdb1a3f0fa79e(context, props.ref), props;
}
var $f6c31cce2adf654f$var$_shouldStopPropagation = /* @__PURE__ */ new WeakMap(), $f6c31cce2adf654f$var$PressEvent = class {
  continuePropagation() {
    _class_private_field_set(this, $f6c31cce2adf654f$var$_shouldStopPropagation, !1);
  }
  get shouldStopPropagation() {
    return _class_private_field_get(this, $f6c31cce2adf654f$var$_shouldStopPropagation);
  }
  constructor(type, pointerType, originalEvent, state) {
    _class_private_field_init(this, $f6c31cce2adf654f$var$_shouldStopPropagation, {
      writable: !0,
      value: void 0
    }), _class_private_field_set(this, $f6c31cce2adf654f$var$_shouldStopPropagation, !0);
    var _state_target;
    let currentTarget = (_state_target = state?.target) !== null && _state_target !== void 0 ? _state_target : originalEvent.currentTarget, rect = currentTarget?.getBoundingClientRect(), x, y = 0, clientX, clientY = null;
    originalEvent.clientX != null && originalEvent.clientY != null && (clientX = originalEvent.clientX, clientY = originalEvent.clientY), rect && (clientX != null && clientY != null ? (x = clientX - rect.left, y = clientY - rect.top) : (x = rect.width / 2, y = rect.height / 2)), this.type = type, this.pointerType = pointerType, this.target = originalEvent.currentTarget, this.shiftKey = originalEvent.shiftKey, this.metaKey = originalEvent.metaKey, this.ctrlKey = originalEvent.ctrlKey, this.altKey = originalEvent.altKey, this.x = x, this.y = y;
  }
}, $f6c31cce2adf654f$var$LINK_CLICKED = Symbol("linkClicked"), $f6c31cce2adf654f$var$STYLE_ID = "react-aria-pressable-style", $f6c31cce2adf654f$var$PRESSABLE_ATTRIBUTE = "data-react-aria-pressable";
function $f6c31cce2adf654f$export$45712eceda6fad21(props) {
  let { onPress, onPressChange, onPressStart, onPressEnd, onPressUp, onClick, isDisabled, isPressed: isPressedProp, preventFocusOnPress, shouldCancelOnPointerExit, allowTextSelectionOnPress, ref: domRef, ...domProps } = $f6c31cce2adf654f$var$usePressResponderContext(props), [isPressed, setPressed] = $7mdmh$useState(!1), ref = $7mdmh$useRef({
    isPressed: !1,
    ignoreEmulatedMouseEvents: !1,
    didFirePressStart: !1,
    isTriggeringEvent: !1,
    activePointerId: null,
    target: null,
    isOverTarget: !1,
    pointerType: null,
    disposables: []
  }), { addGlobalListener, removeAllGlobalListeners } = $03deb23ff14920c4$export$4eaf04e54aa8eed6(), triggerPressStart = $8ae05eaa5c114e9c$export$7f54fc3180508a52((originalEvent, pointerType) => {
    let state = ref.current;
    if (isDisabled || state.didFirePressStart) return !1;
    let shouldStopPropagation = !0;
    if (state.isTriggeringEvent = !0, onPressStart) {
      let event = new $f6c31cce2adf654f$var$PressEvent("pressstart", pointerType, originalEvent);
      onPressStart(event), shouldStopPropagation = event.shouldStopPropagation;
    }
    return onPressChange && onPressChange(!0), state.isTriggeringEvent = !1, state.didFirePressStart = !0, setPressed(!0), shouldStopPropagation;
  }), triggerPressEnd = $8ae05eaa5c114e9c$export$7f54fc3180508a52((originalEvent, pointerType, wasPressed = !0) => {
    let state = ref.current;
    if (!state.didFirePressStart) return !1;
    state.didFirePressStart = !1, state.isTriggeringEvent = !0;
    let shouldStopPropagation = !0;
    if (onPressEnd) {
      let event = new $f6c31cce2adf654f$var$PressEvent("pressend", pointerType, originalEvent);
      onPressEnd(event), shouldStopPropagation = event.shouldStopPropagation;
    }
    if (onPressChange && onPressChange(!1), setPressed(!1), onPress && wasPressed && !isDisabled) {
      let event = new $f6c31cce2adf654f$var$PressEvent("press", pointerType, originalEvent);
      onPress(event), shouldStopPropagation && (shouldStopPropagation = event.shouldStopPropagation);
    }
    return state.isTriggeringEvent = !1, shouldStopPropagation;
  }), triggerPressUp = $8ae05eaa5c114e9c$export$7f54fc3180508a52((originalEvent, pointerType) => {
    let state = ref.current;
    if (isDisabled) return !1;
    if (onPressUp) {
      state.isTriggeringEvent = !0;
      let event = new $f6c31cce2adf654f$var$PressEvent("pressup", pointerType, originalEvent);
      return onPressUp(event), state.isTriggeringEvent = !1, event.shouldStopPropagation;
    }
    return !0;
  }), cancel = $8ae05eaa5c114e9c$export$7f54fc3180508a52((e) => {
    let state = ref.current;
    if (state.isPressed && state.target) {
      state.didFirePressStart && state.pointerType != null && triggerPressEnd($f6c31cce2adf654f$var$createEvent(state.target, e), state.pointerType, !1), state.isPressed = !1, state.isOverTarget = !1, state.activePointerId = null, state.pointerType = null, removeAllGlobalListeners(), allowTextSelectionOnPress || $14c0b72509d70225$export$b0d6fa1ab32e3295(state.target);
      for (let dispose of state.disposables) dispose();
      state.disposables = [];
    }
  }), cancelOnPointerExit = $8ae05eaa5c114e9c$export$7f54fc3180508a52((e) => {
    shouldCancelOnPointerExit && cancel(e);
  }), triggerClick = $8ae05eaa5c114e9c$export$7f54fc3180508a52((e) => {
    isDisabled || onClick?.(e);
  }), triggerSyntheticClick = $8ae05eaa5c114e9c$export$7f54fc3180508a52((e, target) => {
    if (!isDisabled && onClick) {
      let event = new MouseEvent("click", e);
      $8a9cb279dc87e130$export$c2b7abe5d61ec696(event, target), onClick($8a9cb279dc87e130$export$525bc4921d56d4a(event));
    }
  }), pressProps = $7mdmh$useMemo(() => {
    let state = ref.current, pressProps2 = {
      onKeyDown(e) {
        if ($f6c31cce2adf654f$var$isValidKeyboardEvent(e.nativeEvent, e.currentTarget) && $d4ee10de306f2510$export$4282f70798064fe0(e.currentTarget, $d4ee10de306f2510$export$e58f029f0fbfdb29(e.nativeEvent))) {
          var _state_metaKeyEvents;
          $f6c31cce2adf654f$var$shouldPreventDefaultKeyboard($d4ee10de306f2510$export$e58f029f0fbfdb29(e.nativeEvent), e.key) && e.preventDefault();
          let shouldStopPropagation = !0;
          if (!state.isPressed && !e.repeat) {
            state.target = e.currentTarget, state.isPressed = !0, state.pointerType = "keyboard", shouldStopPropagation = triggerPressStart(e, "keyboard");
            let originalTarget = e.currentTarget, pressUp = (e2) => {
              $f6c31cce2adf654f$var$isValidKeyboardEvent(e2, originalTarget) && !e2.repeat && $d4ee10de306f2510$export$4282f70798064fe0(originalTarget, $d4ee10de306f2510$export$e58f029f0fbfdb29(e2)) && state.target && triggerPressUp($f6c31cce2adf654f$var$createEvent(state.target, e2), "keyboard");
            };
            addGlobalListener($431fbd86ca7dc216$export$b204af158042fbac(e.currentTarget), "keyup", $ff5963eb1fccf552$export$e08e3b67e392101e(pressUp, onKeyUp), !0);
          }
          shouldStopPropagation && e.stopPropagation(), e.metaKey && $c87311424ea30a05$export$9ac100e40613ea10() && ((_state_metaKeyEvents = state.metaKeyEvents) === null || _state_metaKeyEvents === void 0 || _state_metaKeyEvents.set(e.key, e.nativeEvent));
        } else e.key === "Meta" && (state.metaKeyEvents = /* @__PURE__ */ new Map());
      },
      onClick(e) {
        if (!(e && !$d4ee10de306f2510$export$4282f70798064fe0(e.currentTarget, $d4ee10de306f2510$export$e58f029f0fbfdb29(e.nativeEvent))) && e && e.button === 0 && !state.isTriggeringEvent && !$ea8dcbcb9ea1b556$export$95185d699e05d4d7.isOpening) {
          let shouldStopPropagation = !0;
          if (isDisabled && e.preventDefault(), !state.ignoreEmulatedMouseEvents && !state.isPressed && (state.pointerType === "virtual" || $6a7db85432448f7f$export$60278871457622de(e.nativeEvent))) {
            let stopPressStart = triggerPressStart(e, "virtual"), stopPressUp = triggerPressUp(e, "virtual"), stopPressEnd = triggerPressEnd(e, "virtual");
            triggerClick(e), shouldStopPropagation = stopPressStart && stopPressUp && stopPressEnd;
          } else if (state.isPressed && state.pointerType !== "keyboard") {
            let pointerType = state.pointerType || e.nativeEvent.pointerType || "virtual", stopPressUp = triggerPressUp($f6c31cce2adf654f$var$createEvent(e.currentTarget, e), pointerType), stopPressEnd = triggerPressEnd($f6c31cce2adf654f$var$createEvent(e.currentTarget, e), pointerType, !0);
            shouldStopPropagation = stopPressUp && stopPressEnd, state.isOverTarget = !1, triggerClick(e), cancel(e);
          }
          state.ignoreEmulatedMouseEvents = !1, shouldStopPropagation && e.stopPropagation();
        }
      }
    }, onKeyUp = (e) => {
      var _state_metaKeyEvents;
      if (state.isPressed && state.target && $f6c31cce2adf654f$var$isValidKeyboardEvent(e, state.target)) {
        var _state_metaKeyEvents1;
        $f6c31cce2adf654f$var$shouldPreventDefaultKeyboard($d4ee10de306f2510$export$e58f029f0fbfdb29(e), e.key) && e.preventDefault();
        let target = $d4ee10de306f2510$export$e58f029f0fbfdb29(e), wasPressed = $d4ee10de306f2510$export$4282f70798064fe0(state.target, $d4ee10de306f2510$export$e58f029f0fbfdb29(e));
        triggerPressEnd($f6c31cce2adf654f$var$createEvent(state.target, e), "keyboard", wasPressed), wasPressed && triggerSyntheticClick(e, state.target), removeAllGlobalListeners(), e.key !== "Enter" && $f6c31cce2adf654f$var$isHTMLAnchorLink(state.target) && $d4ee10de306f2510$export$4282f70798064fe0(state.target, target) && !e[$f6c31cce2adf654f$var$LINK_CLICKED] && (e[$f6c31cce2adf654f$var$LINK_CLICKED] = !0, $ea8dcbcb9ea1b556$export$95185d699e05d4d7(state.target, e, !1)), state.isPressed = !1, (_state_metaKeyEvents1 = state.metaKeyEvents) === null || _state_metaKeyEvents1 === void 0 || _state_metaKeyEvents1.delete(e.key);
      } else if (e.key === "Meta" && (!((_state_metaKeyEvents = state.metaKeyEvents) === null || _state_metaKeyEvents === void 0) && _state_metaKeyEvents.size)) {
        var _state_target;
        let events = state.metaKeyEvents;
        state.metaKeyEvents = void 0;
        for (let event of events.values()) (_state_target = state.target) === null || _state_target === void 0 || _state_target.dispatchEvent(new KeyboardEvent("keyup", event));
      }
    };
    if (typeof PointerEvent < "u") {
      pressProps2.onPointerDown = (e) => {
        if (e.button !== 0 || !$d4ee10de306f2510$export$4282f70798064fe0(e.currentTarget, $d4ee10de306f2510$export$e58f029f0fbfdb29(e.nativeEvent))) return;
        if ($6a7db85432448f7f$export$29bf1b5f2c56cf63(e.nativeEvent)) {
          state.pointerType = "virtual";
          return;
        }
        state.pointerType = e.pointerType;
        let shouldStopPropagation = !0;
        if (!state.isPressed) {
          state.isPressed = !0, state.isOverTarget = !0, state.activePointerId = e.pointerId, state.target = e.currentTarget, allowTextSelectionOnPress || $14c0b72509d70225$export$16a4697467175487(state.target), shouldStopPropagation = triggerPressStart(e, state.pointerType);
          let target = $d4ee10de306f2510$export$e58f029f0fbfdb29(e.nativeEvent);
          "releasePointerCapture" in target && target.releasePointerCapture(e.pointerId), addGlobalListener($431fbd86ca7dc216$export$b204af158042fbac(e.currentTarget), "pointerup", onPointerUp, !1), addGlobalListener($431fbd86ca7dc216$export$b204af158042fbac(e.currentTarget), "pointercancel", onPointerCancel, !1);
        }
        shouldStopPropagation && e.stopPropagation();
      }, pressProps2.onMouseDown = (e) => {
        if ($d4ee10de306f2510$export$4282f70798064fe0(e.currentTarget, $d4ee10de306f2510$export$e58f029f0fbfdb29(e.nativeEvent)) && e.button === 0) {
          if (preventFocusOnPress) {
            let dispose = $8a9cb279dc87e130$export$cabe61c495ee3649(e.target);
            dispose && state.disposables.push(dispose);
          }
          e.stopPropagation();
        }
      }, pressProps2.onPointerUp = (e) => {
        !$d4ee10de306f2510$export$4282f70798064fe0(e.currentTarget, $d4ee10de306f2510$export$e58f029f0fbfdb29(e.nativeEvent)) || state.pointerType === "virtual" || e.button === 0 && !state.isPressed && triggerPressUp(e, state.pointerType || e.pointerType);
      }, pressProps2.onPointerEnter = (e) => {
        e.pointerId === state.activePointerId && state.target && !state.isOverTarget && state.pointerType != null && (state.isOverTarget = !0, triggerPressStart($f6c31cce2adf654f$var$createEvent(state.target, e), state.pointerType));
      }, pressProps2.onPointerLeave = (e) => {
        e.pointerId === state.activePointerId && state.target && state.isOverTarget && state.pointerType != null && (state.isOverTarget = !1, triggerPressEnd($f6c31cce2adf654f$var$createEvent(state.target, e), state.pointerType, !1), cancelOnPointerExit(e));
      };
      let onPointerUp = (e) => {
        if (e.pointerId === state.activePointerId && state.isPressed && e.button === 0 && state.target) {
          if ($d4ee10de306f2510$export$4282f70798064fe0(state.target, $d4ee10de306f2510$export$e58f029f0fbfdb29(e)) && state.pointerType != null) {
            let clicked = !1, timeout = setTimeout(() => {
              state.isPressed && state.target instanceof HTMLElement && (clicked ? cancel(e) : ($7215afc6de606d6b$export$de79e2c695e052f3(state.target), state.target.click()));
            }, 80);
            addGlobalListener(e.currentTarget, "click", () => clicked = !0, !0), state.disposables.push(() => clearTimeout(timeout));
          } else cancel(e);
          state.isOverTarget = !1;
        }
      }, onPointerCancel = (e) => {
        cancel(e);
      };
      pressProps2.onDragStart = (e) => {
        $d4ee10de306f2510$export$4282f70798064fe0(e.currentTarget, $d4ee10de306f2510$export$e58f029f0fbfdb29(e.nativeEvent)) && cancel(e);
      };
    } else if (process.env.NODE_ENV === "test") {
      pressProps2.onMouseDown = (e) => {
        if (e.button !== 0 || !$d4ee10de306f2510$export$4282f70798064fe0(e.currentTarget, $d4ee10de306f2510$export$e58f029f0fbfdb29(e.nativeEvent))) return;
        if (state.ignoreEmulatedMouseEvents) {
          e.stopPropagation();
          return;
        }
        if (state.isPressed = !0, state.isOverTarget = !0, state.target = e.currentTarget, state.pointerType = $6a7db85432448f7f$export$60278871457622de(e.nativeEvent) ? "virtual" : "mouse", $7mdmh$flushSync(() => triggerPressStart(e, state.pointerType)) && e.stopPropagation(), preventFocusOnPress) {
          let dispose = $8a9cb279dc87e130$export$cabe61c495ee3649(e.target);
          dispose && state.disposables.push(dispose);
        }
        addGlobalListener($431fbd86ca7dc216$export$b204af158042fbac(e.currentTarget), "mouseup", onMouseUp, !1);
      }, pressProps2.onMouseEnter = (e) => {
        if (!$d4ee10de306f2510$export$4282f70798064fe0(e.currentTarget, $d4ee10de306f2510$export$e58f029f0fbfdb29(e.nativeEvent))) return;
        let shouldStopPropagation = !0;
        state.isPressed && !state.ignoreEmulatedMouseEvents && state.pointerType != null && (state.isOverTarget = !0, shouldStopPropagation = triggerPressStart(e, state.pointerType)), shouldStopPropagation && e.stopPropagation();
      }, pressProps2.onMouseLeave = (e) => {
        if (!$d4ee10de306f2510$export$4282f70798064fe0(e.currentTarget, $d4ee10de306f2510$export$e58f029f0fbfdb29(e.nativeEvent))) return;
        let shouldStopPropagation = !0;
        state.isPressed && !state.ignoreEmulatedMouseEvents && state.pointerType != null && (state.isOverTarget = !1, shouldStopPropagation = triggerPressEnd(e, state.pointerType, !1), cancelOnPointerExit(e)), shouldStopPropagation && e.stopPropagation();
      }, pressProps2.onMouseUp = (e) => {
        $d4ee10de306f2510$export$4282f70798064fe0(e.currentTarget, $d4ee10de306f2510$export$e58f029f0fbfdb29(e.nativeEvent)) && !state.ignoreEmulatedMouseEvents && e.button === 0 && !state.isPressed && triggerPressUp(e, state.pointerType || "mouse");
      };
      let onMouseUp = (e) => {
        if (e.button === 0) {
          if (state.ignoreEmulatedMouseEvents) {
            state.ignoreEmulatedMouseEvents = !1;
            return;
          }
          state.target && state.target.contains(e.target) && state.pointerType != null || cancel(e), state.isOverTarget = !1;
        }
      };
      pressProps2.onTouchStart = (e) => {
        if (!$d4ee10de306f2510$export$4282f70798064fe0(e.currentTarget, $d4ee10de306f2510$export$e58f029f0fbfdb29(e.nativeEvent))) return;
        let touch = $f6c31cce2adf654f$var$getTouchFromEvent(e.nativeEvent);
        if (!touch) return;
        state.activePointerId = touch.identifier, state.ignoreEmulatedMouseEvents = !0, state.isOverTarget = !0, state.isPressed = !0, state.target = e.currentTarget, state.pointerType = "touch", allowTextSelectionOnPress || $14c0b72509d70225$export$16a4697467175487(state.target), triggerPressStart($f6c31cce2adf654f$var$createTouchEvent(state.target, e), state.pointerType) && e.stopPropagation(), addGlobalListener($431fbd86ca7dc216$export$f21a1ffae260145a(e.currentTarget), "scroll", onScroll, !0);
      }, pressProps2.onTouchMove = (e) => {
        if (!$d4ee10de306f2510$export$4282f70798064fe0(e.currentTarget, $d4ee10de306f2510$export$e58f029f0fbfdb29(e.nativeEvent))) return;
        if (!state.isPressed) {
          e.stopPropagation();
          return;
        }
        let touch = $f6c31cce2adf654f$var$getTouchById(e.nativeEvent, state.activePointerId), shouldStopPropagation = !0;
        touch && $f6c31cce2adf654f$var$isOverTarget(touch, e.currentTarget) ? !state.isOverTarget && state.pointerType != null && (state.isOverTarget = !0, shouldStopPropagation = triggerPressStart($f6c31cce2adf654f$var$createTouchEvent(state.target, e), state.pointerType)) : state.isOverTarget && state.pointerType != null && (state.isOverTarget = !1, shouldStopPropagation = triggerPressEnd($f6c31cce2adf654f$var$createTouchEvent(state.target, e), state.pointerType, !1), cancelOnPointerExit($f6c31cce2adf654f$var$createTouchEvent(state.target, e))), shouldStopPropagation && e.stopPropagation();
      }, pressProps2.onTouchEnd = (e) => {
        if (!$d4ee10de306f2510$export$4282f70798064fe0(e.currentTarget, $d4ee10de306f2510$export$e58f029f0fbfdb29(e.nativeEvent))) return;
        if (!state.isPressed) {
          e.stopPropagation();
          return;
        }
        let touch = $f6c31cce2adf654f$var$getTouchById(e.nativeEvent, state.activePointerId), shouldStopPropagation = !0;
        touch && $f6c31cce2adf654f$var$isOverTarget(touch, e.currentTarget) && state.pointerType != null ? (triggerPressUp($f6c31cce2adf654f$var$createTouchEvent(state.target, e), state.pointerType), shouldStopPropagation = triggerPressEnd($f6c31cce2adf654f$var$createTouchEvent(state.target, e), state.pointerType), triggerSyntheticClick(e.nativeEvent, state.target)) : state.isOverTarget && state.pointerType != null && (shouldStopPropagation = triggerPressEnd($f6c31cce2adf654f$var$createTouchEvent(state.target, e), state.pointerType, !1)), shouldStopPropagation && e.stopPropagation(), state.isPressed = !1, state.activePointerId = null, state.isOverTarget = !1, state.ignoreEmulatedMouseEvents = !0, state.target && !allowTextSelectionOnPress && $14c0b72509d70225$export$b0d6fa1ab32e3295(state.target), removeAllGlobalListeners();
      }, pressProps2.onTouchCancel = (e) => {
        $d4ee10de306f2510$export$4282f70798064fe0(e.currentTarget, $d4ee10de306f2510$export$e58f029f0fbfdb29(e.nativeEvent)) && (e.stopPropagation(), state.isPressed && cancel($f6c31cce2adf654f$var$createTouchEvent(state.target, e)));
      };
      let onScroll = (e) => {
        state.isPressed && $d4ee10de306f2510$export$4282f70798064fe0($d4ee10de306f2510$export$e58f029f0fbfdb29(e), state.target) && cancel({
          currentTarget: state.target,
          shiftKey: !1,
          ctrlKey: !1,
          metaKey: !1,
          altKey: !1
        });
      };
      pressProps2.onDragStart = (e) => {
        $d4ee10de306f2510$export$4282f70798064fe0(e.currentTarget, $d4ee10de306f2510$export$e58f029f0fbfdb29(e.nativeEvent)) && cancel(e);
      };
    }
    return pressProps2;
  }, [
    addGlobalListener,
    isDisabled,
    preventFocusOnPress,
    removeAllGlobalListeners,
    allowTextSelectionOnPress,
    cancel,
    cancelOnPointerExit,
    triggerPressEnd,
    triggerPressStart,
    triggerPressUp,
    triggerClick,
    triggerSyntheticClick
  ]);
  return $7mdmh$useEffect(() => {
    if (!domRef || process.env.NODE_ENV === "test") return;
    let ownerDocument = $431fbd86ca7dc216$export$b204af158042fbac(domRef.current);
    if (!ownerDocument || !ownerDocument.head || ownerDocument.getElementById($f6c31cce2adf654f$var$STYLE_ID)) return;
    let style = ownerDocument.createElement("style");
    style.id = $f6c31cce2adf654f$var$STYLE_ID, style.textContent = `
@layer {
  [${$f6c31cce2adf654f$var$PRESSABLE_ATTRIBUTE}] {
    touch-action: pan-x pan-y pinch-zoom;
  }
}
    `.trim(), ownerDocument.head.prepend(style);
  }, [
    domRef
  ]), $7mdmh$useEffect(() => {
    let state = ref.current;
    return () => {
      var _state_target;
      allowTextSelectionOnPress || $14c0b72509d70225$export$b0d6fa1ab32e3295((_state_target = state.target) !== null && _state_target !== void 0 ? _state_target : void 0);
      for (let dispose of state.disposables) dispose();
      state.disposables = [];
    };
  }, [
    allowTextSelectionOnPress
  ]), {
    isPressed: isPressedProp || isPressed,
    pressProps: $3ef42575df84b30b$export$9d1611c77c2fe928(domProps, pressProps, {
      [$f6c31cce2adf654f$var$PRESSABLE_ATTRIBUTE]: !0
    })
  };
}
function $f6c31cce2adf654f$var$isHTMLAnchorLink(target) {
  return target.tagName === "A" && target.hasAttribute("href");
}
function $f6c31cce2adf654f$var$isValidKeyboardEvent(event, currentTarget) {
  let { key, code } = event, element = currentTarget, role = element.getAttribute("role");
  return (key === "Enter" || key === " " || key === "Spacebar" || code === "Space") && !(element instanceof $431fbd86ca7dc216$export$f21a1ffae260145a(element).HTMLInputElement && !$f6c31cce2adf654f$var$isValidInputKey(element, key) || element instanceof $431fbd86ca7dc216$export$f21a1ffae260145a(element).HTMLTextAreaElement || element.isContentEditable) && // Links should only trigger with Enter key
  !((role === "link" || !role && $f6c31cce2adf654f$var$isHTMLAnchorLink(element)) && key !== "Enter");
}
function $f6c31cce2adf654f$var$getTouchFromEvent(event) {
  let { targetTouches } = event;
  return targetTouches.length > 0 ? targetTouches[0] : null;
}
function $f6c31cce2adf654f$var$getTouchById(event, pointerId) {
  let changedTouches = event.changedTouches;
  for (let i = 0; i < changedTouches.length; i++) {
    let touch = changedTouches[i];
    if (touch.identifier === pointerId) return touch;
  }
  return null;
}
function $f6c31cce2adf654f$var$createTouchEvent(target, e) {
  let clientX = 0, clientY = 0;
  return e.targetTouches && e.targetTouches.length === 1 && (clientX = e.targetTouches[0].clientX, clientY = e.targetTouches[0].clientY), {
    currentTarget: target,
    shiftKey: e.shiftKey,
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
    altKey: e.altKey,
    clientX,
    clientY
  };
}
function $f6c31cce2adf654f$var$createEvent(target, e) {
  let clientX = e.clientX, clientY = e.clientY;
  return {
    currentTarget: target,
    shiftKey: e.shiftKey,
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
    altKey: e.altKey,
    clientX,
    clientY
  };
}
function $f6c31cce2adf654f$var$getPointClientRect(point) {
  let offsetX = 0, offsetY = 0;
  return point.width !== void 0 ? offsetX = point.width / 2 : point.radiusX !== void 0 && (offsetX = point.radiusX), point.height !== void 0 ? offsetY = point.height / 2 : point.radiusY !== void 0 && (offsetY = point.radiusY), {
    top: point.clientY - offsetY,
    right: point.clientX + offsetX,
    bottom: point.clientY + offsetY,
    left: point.clientX - offsetX
  };
}
function $f6c31cce2adf654f$var$areRectanglesOverlapping(a, b) {
  return !(a.left > b.right || b.left > a.right || a.top > b.bottom || b.top > a.bottom);
}
function $f6c31cce2adf654f$var$isOverTarget(point, target) {
  let rect = target.getBoundingClientRect(), pointRect = $f6c31cce2adf654f$var$getPointClientRect(point);
  return $f6c31cce2adf654f$var$areRectanglesOverlapping(rect, pointRect);
}
function $f6c31cce2adf654f$var$shouldPreventDefaultUp(target) {
  return target instanceof HTMLInputElement ? !1 : target instanceof HTMLButtonElement ? target.type !== "submit" && target.type !== "reset" : !$f6c31cce2adf654f$var$isHTMLAnchorLink(target);
}
function $f6c31cce2adf654f$var$shouldPreventDefaultKeyboard(target, key) {
  return target instanceof HTMLInputElement ? !$f6c31cce2adf654f$var$isValidInputKey(target, key) : $f6c31cce2adf654f$var$shouldPreventDefaultUp(target);
}
var $f6c31cce2adf654f$var$nonTextInputTypes = /* @__PURE__ */ new Set([
  "checkbox",
  "radio",
  "range",
  "color",
  "file",
  "image",
  "button",
  "submit",
  "reset"
]);
function $f6c31cce2adf654f$var$isValidInputKey(target, key) {
  return target.type === "checkbox" || target.type === "radio" ? key === " " : $f6c31cce2adf654f$var$nonTextInputTypes.has(target.type);
}

// ../node_modules/@react-aria/interactions/dist/useFocusVisible.mjs
import { useState as $28AnR$useState, useEffect as $28AnR$useEffect } from "react";
var $507fabe10e71c6fb$var$currentModality = null, $507fabe10e71c6fb$var$changeHandlers = /* @__PURE__ */ new Set(), $507fabe10e71c6fb$export$d90243b58daecda7 = /* @__PURE__ */ new Map(), $507fabe10e71c6fb$var$hasEventBeforeFocus = !1, $507fabe10e71c6fb$var$hasBlurredWindowRecently = !1, $507fabe10e71c6fb$var$FOCUS_VISIBLE_INPUT_KEYS = {
  Tab: !0,
  Escape: !0
};
function $507fabe10e71c6fb$var$triggerChangeHandlers(modality, e) {
  for (let handler of $507fabe10e71c6fb$var$changeHandlers) handler(modality, e);
}
function $507fabe10e71c6fb$var$isValidKey(e) {
  return !(e.metaKey || !$c87311424ea30a05$export$9ac100e40613ea10() && e.altKey || e.ctrlKey || e.key === "Control" || e.key === "Shift" || e.key === "Meta");
}
function $507fabe10e71c6fb$var$handleKeyboardEvent(e) {
  $507fabe10e71c6fb$var$hasEventBeforeFocus = !0, $507fabe10e71c6fb$var$isValidKey(e) && ($507fabe10e71c6fb$var$currentModality = "keyboard", $507fabe10e71c6fb$var$triggerChangeHandlers("keyboard", e));
}
function $507fabe10e71c6fb$var$handlePointerEvent(e) {
  $507fabe10e71c6fb$var$currentModality = "pointer", (e.type === "mousedown" || e.type === "pointerdown") && ($507fabe10e71c6fb$var$hasEventBeforeFocus = !0, $507fabe10e71c6fb$var$triggerChangeHandlers("pointer", e));
}
function $507fabe10e71c6fb$var$handleClickEvent(e) {
  $6a7db85432448f7f$export$60278871457622de(e) && ($507fabe10e71c6fb$var$hasEventBeforeFocus = !0, $507fabe10e71c6fb$var$currentModality = "virtual");
}
function $507fabe10e71c6fb$var$handleFocusEvent(e) {
  e.target === window || e.target === document || $8a9cb279dc87e130$export$fda7da73ab5d4c48 || !e.isTrusted || (!$507fabe10e71c6fb$var$hasEventBeforeFocus && !$507fabe10e71c6fb$var$hasBlurredWindowRecently && ($507fabe10e71c6fb$var$currentModality = "virtual", $507fabe10e71c6fb$var$triggerChangeHandlers("virtual", e)), $507fabe10e71c6fb$var$hasEventBeforeFocus = !1, $507fabe10e71c6fb$var$hasBlurredWindowRecently = !1);
}
function $507fabe10e71c6fb$var$handleWindowBlur() {
  $8a9cb279dc87e130$export$fda7da73ab5d4c48 || ($507fabe10e71c6fb$var$hasEventBeforeFocus = !1, $507fabe10e71c6fb$var$hasBlurredWindowRecently = !0);
}
function $507fabe10e71c6fb$var$setupGlobalFocusEvents(element) {
  if (typeof window > "u" || typeof document > "u" || $507fabe10e71c6fb$export$d90243b58daecda7.get($431fbd86ca7dc216$export$f21a1ffae260145a(element))) return;
  let windowObject = $431fbd86ca7dc216$export$f21a1ffae260145a(element), documentObject = $431fbd86ca7dc216$export$b204af158042fbac(element), focus = windowObject.HTMLElement.prototype.focus;
  windowObject.HTMLElement.prototype.focus = function() {
    $507fabe10e71c6fb$var$hasEventBeforeFocus = !0, focus.apply(this, arguments);
  }, documentObject.addEventListener("keydown", $507fabe10e71c6fb$var$handleKeyboardEvent, !0), documentObject.addEventListener("keyup", $507fabe10e71c6fb$var$handleKeyboardEvent, !0), documentObject.addEventListener("click", $507fabe10e71c6fb$var$handleClickEvent, !0), windowObject.addEventListener("focus", $507fabe10e71c6fb$var$handleFocusEvent, !0), windowObject.addEventListener("blur", $507fabe10e71c6fb$var$handleWindowBlur, !1), typeof PointerEvent < "u" ? (documentObject.addEventListener("pointerdown", $507fabe10e71c6fb$var$handlePointerEvent, !0), documentObject.addEventListener("pointermove", $507fabe10e71c6fb$var$handlePointerEvent, !0), documentObject.addEventListener("pointerup", $507fabe10e71c6fb$var$handlePointerEvent, !0)) : process.env.NODE_ENV === "test" && (documentObject.addEventListener("mousedown", $507fabe10e71c6fb$var$handlePointerEvent, !0), documentObject.addEventListener("mousemove", $507fabe10e71c6fb$var$handlePointerEvent, !0), documentObject.addEventListener("mouseup", $507fabe10e71c6fb$var$handlePointerEvent, !0)), windowObject.addEventListener("beforeunload", () => {
    $507fabe10e71c6fb$var$tearDownWindowFocusTracking(element);
  }, {
    once: !0
  }), $507fabe10e71c6fb$export$d90243b58daecda7.set(windowObject, {
    focus
  });
}
var $507fabe10e71c6fb$var$tearDownWindowFocusTracking = (element, loadListener) => {
  let windowObject = $431fbd86ca7dc216$export$f21a1ffae260145a(element), documentObject = $431fbd86ca7dc216$export$b204af158042fbac(element);
  loadListener && documentObject.removeEventListener("DOMContentLoaded", loadListener), $507fabe10e71c6fb$export$d90243b58daecda7.has(windowObject) && (windowObject.HTMLElement.prototype.focus = $507fabe10e71c6fb$export$d90243b58daecda7.get(windowObject).focus, documentObject.removeEventListener("keydown", $507fabe10e71c6fb$var$handleKeyboardEvent, !0), documentObject.removeEventListener("keyup", $507fabe10e71c6fb$var$handleKeyboardEvent, !0), documentObject.removeEventListener("click", $507fabe10e71c6fb$var$handleClickEvent, !0), windowObject.removeEventListener("focus", $507fabe10e71c6fb$var$handleFocusEvent, !0), windowObject.removeEventListener("blur", $507fabe10e71c6fb$var$handleWindowBlur, !1), typeof PointerEvent < "u" ? (documentObject.removeEventListener("pointerdown", $507fabe10e71c6fb$var$handlePointerEvent, !0), documentObject.removeEventListener("pointermove", $507fabe10e71c6fb$var$handlePointerEvent, !0), documentObject.removeEventListener("pointerup", $507fabe10e71c6fb$var$handlePointerEvent, !0)) : process.env.NODE_ENV === "test" && (documentObject.removeEventListener("mousedown", $507fabe10e71c6fb$var$handlePointerEvent, !0), documentObject.removeEventListener("mousemove", $507fabe10e71c6fb$var$handlePointerEvent, !0), documentObject.removeEventListener("mouseup", $507fabe10e71c6fb$var$handlePointerEvent, !0)), $507fabe10e71c6fb$export$d90243b58daecda7.delete(windowObject));
};
function $507fabe10e71c6fb$export$2f1888112f558a7d(element) {
  let documentObject = $431fbd86ca7dc216$export$b204af158042fbac(element), loadListener;
  return documentObject.readyState !== "loading" ? $507fabe10e71c6fb$var$setupGlobalFocusEvents(element) : (loadListener = () => {
    $507fabe10e71c6fb$var$setupGlobalFocusEvents(element);
  }, documentObject.addEventListener("DOMContentLoaded", loadListener)), () => $507fabe10e71c6fb$var$tearDownWindowFocusTracking(element, loadListener);
}
typeof document < "u" && $507fabe10e71c6fb$export$2f1888112f558a7d();
function $507fabe10e71c6fb$export$b9b3dfddab17db27() {
  return $507fabe10e71c6fb$var$currentModality !== "pointer";
}
function $507fabe10e71c6fb$export$630ff653c5ada6a9() {
  return $507fabe10e71c6fb$var$currentModality;
}
function $507fabe10e71c6fb$export$98e20ec92f614cfe() {
  $507fabe10e71c6fb$var$setupGlobalFocusEvents();
  let [modality, setModality] = $28AnR$useState($507fabe10e71c6fb$var$currentModality);
  return $28AnR$useEffect(() => {
    let handler = () => {
      setModality($507fabe10e71c6fb$var$currentModality);
    };
    return $507fabe10e71c6fb$var$changeHandlers.add(handler), () => {
      $507fabe10e71c6fb$var$changeHandlers.delete(handler);
    };
  }, []), $b5e257d569688ac6$export$535bd6ca7f90a273() ? null : modality;
}
var $507fabe10e71c6fb$var$nonTextInputTypes = /* @__PURE__ */ new Set([
  "checkbox",
  "radio",
  "range",
  "color",
  "file",
  "image",
  "button",
  "submit",
  "reset"
]);
function $507fabe10e71c6fb$var$isKeyboardFocusEvent(isTextInput, modality, e) {
  let document1 = $431fbd86ca7dc216$export$b204af158042fbac(e?.target), IHTMLInputElement = typeof window < "u" ? $431fbd86ca7dc216$export$f21a1ffae260145a(e?.target).HTMLInputElement : HTMLInputElement, IHTMLTextAreaElement = typeof window < "u" ? $431fbd86ca7dc216$export$f21a1ffae260145a(e?.target).HTMLTextAreaElement : HTMLTextAreaElement, IHTMLElement = typeof window < "u" ? $431fbd86ca7dc216$export$f21a1ffae260145a(e?.target).HTMLElement : HTMLElement, IKeyboardEvent = typeof window < "u" ? $431fbd86ca7dc216$export$f21a1ffae260145a(e?.target).KeyboardEvent : KeyboardEvent;
  return isTextInput = isTextInput || document1.activeElement instanceof IHTMLInputElement && !$507fabe10e71c6fb$var$nonTextInputTypes.has(document1.activeElement.type) || document1.activeElement instanceof IHTMLTextAreaElement || document1.activeElement instanceof IHTMLElement && document1.activeElement.isContentEditable, !(isTextInput && modality === "keyboard" && e instanceof IKeyboardEvent && !$507fabe10e71c6fb$var$FOCUS_VISIBLE_INPUT_KEYS[e.key]);
}
function $507fabe10e71c6fb$export$ec71b4b83ac08ec3(fn, deps, opts) {
  $507fabe10e71c6fb$var$setupGlobalFocusEvents(), $28AnR$useEffect(() => {
    let handler = (modality, e) => {
      $507fabe10e71c6fb$var$isKeyboardFocusEvent(!!opts?.isTextInput, modality, e) && fn($507fabe10e71c6fb$export$b9b3dfddab17db27());
    };
    return $507fabe10e71c6fb$var$changeHandlers.add(handler), () => {
      $507fabe10e71c6fb$var$changeHandlers.delete(handler);
    };
  }, deps);
}

// ../node_modules/@react-aria/interactions/dist/focusSafely.mjs
function $3ad3f6e1647bc98d$export$80f3e147d781571c(element) {
  let ownerDocument = $431fbd86ca7dc216$export$b204af158042fbac(element), activeElement = $d4ee10de306f2510$export$cd4e5573fbe2b576(ownerDocument);
  if ($507fabe10e71c6fb$export$630ff653c5ada6a9() === "virtual") {
    let lastFocusedElement = activeElement;
    $bbed8b41f857bcc0$export$24490316f764c430(() => {
      $d4ee10de306f2510$export$cd4e5573fbe2b576(ownerDocument) === lastFocusedElement && element.isConnected && $7215afc6de606d6b$export$de79e2c695e052f3(element);
    });
  } else $7215afc6de606d6b$export$de79e2c695e052f3(element);
}

// ../node_modules/@react-aria/interactions/dist/useFocus.mjs
import { useCallback as $hf0lj$useCallback } from "react";
function $a1ea59d68270f0dd$export$f8168d8dd8fd66e6(props) {
  let { isDisabled, onFocus: onFocusProp, onBlur: onBlurProp, onFocusChange } = props, onBlur = $hf0lj$useCallback((e) => {
    if (e.target === e.currentTarget)
      return onBlurProp && onBlurProp(e), onFocusChange && onFocusChange(!1), !0;
  }, [
    onBlurProp,
    onFocusChange
  ]), onSyntheticFocus = $8a9cb279dc87e130$export$715c682d09d639cc(onBlur), onFocus = $hf0lj$useCallback((e) => {
    let ownerDocument = $431fbd86ca7dc216$export$b204af158042fbac(e.target), activeElement = ownerDocument ? $d4ee10de306f2510$export$cd4e5573fbe2b576(ownerDocument) : $d4ee10de306f2510$export$cd4e5573fbe2b576();
    e.target === e.currentTarget && activeElement === $d4ee10de306f2510$export$e58f029f0fbfdb29(e.nativeEvent) && (onFocusProp && onFocusProp(e), onFocusChange && onFocusChange(!0), onSyntheticFocus(e));
  }, [
    onFocusChange,
    onFocusProp,
    onSyntheticFocus
  ]);
  return {
    focusProps: {
      onFocus: !isDisabled && (onFocusProp || onFocusChange || onBlurProp) ? onFocus : void 0,
      onBlur: !isDisabled && (onBlurProp || onFocusChange) ? onBlur : void 0
    }
  };
}

// ../node_modules/@react-aria/interactions/dist/createEventHandler.mjs
function $93925083ecbb358c$export$48d1ea6320830260(handler) {
  if (!handler) return;
  let shouldStopPropagation = !0;
  return (e) => {
    let event = {
      ...e,
      preventDefault() {
        e.preventDefault();
      },
      isDefaultPrevented() {
        return e.isDefaultPrevented();
      },
      stopPropagation() {
        shouldStopPropagation && process.env.NODE_ENV !== "production" ? console.error("stopPropagation is now the default behavior for events in React Spectrum. You can use continuePropagation() to revert this behavior.") : shouldStopPropagation = !0;
      },
      continuePropagation() {
        shouldStopPropagation = !1;
      },
      isPropagationStopped() {
        return shouldStopPropagation;
      }
    };
    handler(event), shouldStopPropagation && e.stopPropagation();
  };
}

// ../node_modules/@react-aria/interactions/dist/useKeyboard.mjs
function $46d819fcbaf35654$export$8f71654801c2f7cd(props) {
  return {
    keyboardProps: props.isDisabled ? {} : {
      onKeyDown: $93925083ecbb358c$export$48d1ea6320830260(props.onKeyDown),
      onKeyUp: $93925083ecbb358c$export$48d1ea6320830260(props.onKeyUp)
    }
  };
}

// ../node_modules/@react-aria/interactions/dist/useFocusable.mjs
import $fcPuG$react, { useContext as $fcPuG$useContext, useRef as $fcPuG$useRef, useEffect as $fcPuG$useEffect, forwardRef as $fcPuG$forwardRef } from "react";
var $f645667febf57a63$export$f9762fab77588ecb = $fcPuG$react.createContext(null);
function $f645667febf57a63$var$useFocusableContext(ref) {
  let context = $fcPuG$useContext($f645667febf57a63$export$f9762fab77588ecb) || {};
  $e7801be82b4b2a53$export$4debdb1a3f0fa79e(context, ref);
  let { ref: _, ...otherProps } = context;
  return otherProps;
}
var $f645667febf57a63$export$13f3202a3e5ddd5 = $fcPuG$react.forwardRef(function(props, ref) {
  let { children, ...otherProps } = props, objRef = $df56164dff5785e2$export$4338b53315abf666(ref), context = {
    ...otherProps,
    ref: objRef
  };
  return $fcPuG$react.createElement($f645667febf57a63$export$f9762fab77588ecb.Provider, {
    value: context
  }, children);
});
function $f645667febf57a63$export$4c014de7c8940b4c(props, domRef) {
  let { focusProps } = $a1ea59d68270f0dd$export$f8168d8dd8fd66e6(props), { keyboardProps } = $46d819fcbaf35654$export$8f71654801c2f7cd(props), interactions = $3ef42575df84b30b$export$9d1611c77c2fe928(focusProps, keyboardProps), domProps = $f645667febf57a63$var$useFocusableContext(domRef), interactionProps = props.isDisabled ? {} : domProps, autoFocusRef = $fcPuG$useRef(props.autoFocus);
  $fcPuG$useEffect(() => {
    autoFocusRef.current && domRef.current && $3ad3f6e1647bc98d$export$80f3e147d781571c(domRef.current), autoFocusRef.current = !1;
  }, [
    domRef
  ]);
  let tabIndex = props.excludeFromTabOrder ? -1 : 0;
  return props.isDisabled && (tabIndex = void 0), {
    focusableProps: $3ef42575df84b30b$export$9d1611c77c2fe928({
      ...interactions,
      tabIndex
    }, interactionProps)
  };
}
var $f645667febf57a63$export$35a3bebf7ef2d934 = $fcPuG$forwardRef(({ children, ...props }, ref) => {
  ref = $df56164dff5785e2$export$4338b53315abf666(ref);
  let { focusableProps } = $f645667febf57a63$export$4c014de7c8940b4c(props, ref), child = $fcPuG$react.Children.only(children);
  $fcPuG$useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    let el = ref.current;
    if (!el || !(el instanceof $431fbd86ca7dc216$export$f21a1ffae260145a(el).Element)) {
      console.error("<Focusable> child must forward its ref to a DOM element.");
      return;
    }
    if (!props.isDisabled && !$b4b717babfbb907b$export$4c063cf1350e6fed(el)) {
      console.warn("<Focusable> child must be focusable. Please ensure the tabIndex prop is passed through.");
      return;
    }
    if (el.localName !== "button" && el.localName !== "input" && el.localName !== "select" && el.localName !== "textarea" && el.localName !== "a" && el.localName !== "area" && el.localName !== "summary" && el.localName !== "img" && el.localName !== "svg") {
      let role = el.getAttribute("role");
      role ? (
        // https://w3c.github.io/aria/#widget_roles
        role !== "application" && role !== "button" && role !== "checkbox" && role !== "combobox" && role !== "gridcell" && role !== "link" && role !== "menuitem" && role !== "menuitemcheckbox" && role !== "menuitemradio" && role !== "option" && role !== "radio" && role !== "searchbox" && role !== "separator" && role !== "slider" && role !== "spinbutton" && role !== "switch" && role !== "tab" && role !== "tabpanel" && role !== "textbox" && role !== "treeitem" && // aria-describedby is also announced on these roles
        role !== "img" && role !== "meter" && role !== "progressbar" && console.warn(`<Focusable> child must have an interactive ARIA role. Got "${role}".`)
      ) : console.warn("<Focusable> child must have an interactive ARIA role.");
    }
  }, [
    ref,
    props.isDisabled
  ]);
  let childRef = parseInt($fcPuG$react.version, 10) < 19 ? child.ref : child.props.ref;
  return $fcPuG$react.cloneElement(child, {
    ...$3ef42575df84b30b$export$9d1611c77c2fe928(focusableProps, child.props),
    // @ts-ignore
    ref: $5dc95899b306f630$export$c9058316764c140e(childRef, ref)
  });
});

// ../node_modules/@react-aria/interactions/dist/Pressable.mjs
import $hhDyF$react, { useEffect as $hhDyF$useEffect } from "react";
var $3b117e43dc0ca95d$export$27c701ed9e449e99 = $hhDyF$react.forwardRef(({ children, ...props }, ref) => {
  ref = $df56164dff5785e2$export$4338b53315abf666(ref);
  let { pressProps } = $f6c31cce2adf654f$export$45712eceda6fad21({
    ...props,
    ref
  }), { focusableProps } = $f645667febf57a63$export$4c014de7c8940b4c(props, ref), child = $hhDyF$react.Children.only(children);
  $hhDyF$useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    let el = ref.current;
    if (!el || !(el instanceof $431fbd86ca7dc216$export$f21a1ffae260145a(el).Element)) {
      console.error("<Pressable> child must forward its ref to a DOM element.");
      return;
    }
    if (!props.isDisabled && !$b4b717babfbb907b$export$4c063cf1350e6fed(el)) {
      console.warn("<Pressable> child must be focusable. Please ensure the tabIndex prop is passed through.");
      return;
    }
    if (el.localName !== "button" && el.localName !== "input" && el.localName !== "select" && el.localName !== "textarea" && el.localName !== "a" && el.localName !== "area" && el.localName !== "summary") {
      let role = el.getAttribute("role");
      role ? (
        // https://w3c.github.io/aria/#widget_roles
        role !== "application" && role !== "button" && role !== "checkbox" && role !== "combobox" && role !== "gridcell" && role !== "link" && role !== "menuitem" && role !== "menuitemcheckbox" && role !== "menuitemradio" && role !== "option" && role !== "radio" && role !== "searchbox" && role !== "separator" && role !== "slider" && role !== "spinbutton" && role !== "switch" && role !== "tab" && role !== "textbox" && role !== "treeitem" && console.warn(`<Pressable> child must have an interactive ARIA role. Got "${role}".`)
      ) : console.warn("<Pressable> child must have an interactive ARIA role.");
    }
  }, [
    ref,
    props.isDisabled
  ]);
  let childRef = parseInt($hhDyF$react.version, 10) < 19 ? child.ref : child.props.ref;
  return $hhDyF$react.cloneElement(child, {
    ...$3ef42575df84b30b$export$9d1611c77c2fe928(pressProps, focusableProps, child.props),
    // @ts-ignore
    ref: $5dc95899b306f630$export$c9058316764c140e(childRef, ref)
  });
});

// ../node_modules/@react-aria/interactions/dist/PressResponder.mjs
import $87RPk$react, { useRef as $87RPk$useRef, useContext as $87RPk$useContext, useEffect as $87RPk$useEffect, useMemo as $87RPk$useMemo } from "react";
var $f1ab8c75478c6f73$export$3351871ee4b288b8 = $87RPk$react.forwardRef(({ children, ...props }, ref) => {
  let isRegistered = $87RPk$useRef(!1), prevContext = $87RPk$useContext($ae1eeba8b9eafd08$export$5165eccb35aaadb5);
  ref = $df56164dff5785e2$export$4338b53315abf666(ref || prevContext?.ref);
  let context = $3ef42575df84b30b$export$9d1611c77c2fe928(prevContext || {}, {
    ...props,
    ref,
    register() {
      isRegistered.current = !0, prevContext && prevContext.register();
    }
  });
  return $e7801be82b4b2a53$export$4debdb1a3f0fa79e(prevContext, ref), $87RPk$useEffect(() => {
    isRegistered.current || (process.env.NODE_ENV !== "production" && console.warn("A PressResponder was rendered without a pressable child. Either call the usePress hook, or wrap your DOM node with <Pressable> component."), isRegistered.current = !0);
  }, []), $87RPk$react.createElement($ae1eeba8b9eafd08$export$5165eccb35aaadb5.Provider, {
    value: context
  }, children);
});
function $f1ab8c75478c6f73$export$cf75428e0b9ed1ea({ children }) {
  let context = $87RPk$useMemo(() => ({
    register: () => {
    }
  }), []);
  return $87RPk$react.createElement($ae1eeba8b9eafd08$export$5165eccb35aaadb5.Provider, {
    value: context
  }, children);
}

// ../node_modules/@react-aria/interactions/dist/useFocusWithin.mjs
import { useRef as $3b9Q0$useRef, useCallback as $3b9Q0$useCallback } from "react";
function $9ab94262bd0047c7$export$420e68273165f4ec(props) {
  let { isDisabled, onBlurWithin, onFocusWithin, onFocusWithinChange } = props, state = $3b9Q0$useRef({
    isFocusWithin: !1
  }), { addGlobalListener, removeAllGlobalListeners } = $03deb23ff14920c4$export$4eaf04e54aa8eed6(), onBlur = $3b9Q0$useCallback((e) => {
    e.currentTarget.contains(e.target) && state.current.isFocusWithin && !e.currentTarget.contains(e.relatedTarget) && (state.current.isFocusWithin = !1, removeAllGlobalListeners(), onBlurWithin && onBlurWithin(e), onFocusWithinChange && onFocusWithinChange(!1));
  }, [
    onBlurWithin,
    onFocusWithinChange,
    state,
    removeAllGlobalListeners
  ]), onSyntheticFocus = $8a9cb279dc87e130$export$715c682d09d639cc(onBlur), onFocus = $3b9Q0$useCallback((e) => {
    if (!e.currentTarget.contains(e.target)) return;
    let ownerDocument = $431fbd86ca7dc216$export$b204af158042fbac(e.target), activeElement = $d4ee10de306f2510$export$cd4e5573fbe2b576(ownerDocument);
    if (!state.current.isFocusWithin && activeElement === $d4ee10de306f2510$export$e58f029f0fbfdb29(e.nativeEvent)) {
      onFocusWithin && onFocusWithin(e), onFocusWithinChange && onFocusWithinChange(!0), state.current.isFocusWithin = !0, onSyntheticFocus(e);
      let currentTarget = e.currentTarget;
      addGlobalListener(ownerDocument, "focus", (e2) => {
        if (state.current.isFocusWithin && !$d4ee10de306f2510$export$4282f70798064fe0(currentTarget, e2.target)) {
          let nativeEvent = new ownerDocument.defaultView.FocusEvent("blur", {
            relatedTarget: e2.target
          });
          $8a9cb279dc87e130$export$c2b7abe5d61ec696(nativeEvent, currentTarget);
          let event = $8a9cb279dc87e130$export$525bc4921d56d4a(nativeEvent);
          onBlur(event);
        }
      }, {
        capture: !0
      });
    }
  }, [
    onFocusWithin,
    onFocusWithinChange,
    onSyntheticFocus,
    addGlobalListener,
    onBlur
  ]);
  return isDisabled ? {
    focusWithinProps: {
      // These cannot be null, that would conflict in mergeProps
      onFocus: void 0,
      onBlur: void 0
    }
  } : {
    focusWithinProps: {
      onFocus,
      onBlur
    }
  };
}

// ../node_modules/@react-aria/interactions/dist/useHover.mjs
import { useState as $AWxnT$useState, useRef as $AWxnT$useRef, useEffect as $AWxnT$useEffect, useMemo as $AWxnT$useMemo } from "react";
var $6179b936705e76d3$var$globalIgnoreEmulatedMouseEvents = !1, $6179b936705e76d3$var$hoverCount = 0;
function $6179b936705e76d3$var$setGlobalIgnoreEmulatedMouseEvents() {
  $6179b936705e76d3$var$globalIgnoreEmulatedMouseEvents = !0, setTimeout(() => {
    $6179b936705e76d3$var$globalIgnoreEmulatedMouseEvents = !1;
  }, 50);
}
function $6179b936705e76d3$var$handleGlobalPointerEvent(e) {
  e.pointerType === "touch" && $6179b936705e76d3$var$setGlobalIgnoreEmulatedMouseEvents();
}
function $6179b936705e76d3$var$setupGlobalTouchEvents() {
  if (!(typeof document > "u"))
    return $6179b936705e76d3$var$hoverCount === 0 && (typeof PointerEvent < "u" ? document.addEventListener("pointerup", $6179b936705e76d3$var$handleGlobalPointerEvent) : process.env.NODE_ENV === "test" && document.addEventListener("touchend", $6179b936705e76d3$var$setGlobalIgnoreEmulatedMouseEvents)), $6179b936705e76d3$var$hoverCount++, () => {
      $6179b936705e76d3$var$hoverCount--, !($6179b936705e76d3$var$hoverCount > 0) && (typeof PointerEvent < "u" ? document.removeEventListener("pointerup", $6179b936705e76d3$var$handleGlobalPointerEvent) : process.env.NODE_ENV === "test" && document.removeEventListener("touchend", $6179b936705e76d3$var$setGlobalIgnoreEmulatedMouseEvents));
    };
}
function $6179b936705e76d3$export$ae780daf29e6d456(props) {
  let { onHoverStart, onHoverChange, onHoverEnd, isDisabled } = props, [isHovered, setHovered] = $AWxnT$useState(!1), state = $AWxnT$useRef({
    isHovered: !1,
    ignoreEmulatedMouseEvents: !1,
    pointerType: "",
    target: null
  }).current;
  $AWxnT$useEffect($6179b936705e76d3$var$setupGlobalTouchEvents, []);
  let { addGlobalListener, removeAllGlobalListeners } = $03deb23ff14920c4$export$4eaf04e54aa8eed6(), { hoverProps, triggerHoverEnd } = $AWxnT$useMemo(() => {
    let triggerHoverStart = (event, pointerType) => {
      if (state.pointerType = pointerType, isDisabled || pointerType === "touch" || state.isHovered || !event.currentTarget.contains(event.target)) return;
      state.isHovered = !0;
      let target = event.currentTarget;
      state.target = target, addGlobalListener($431fbd86ca7dc216$export$b204af158042fbac(event.target), "pointerover", (e) => {
        state.isHovered && state.target && !$d4ee10de306f2510$export$4282f70798064fe0(state.target, e.target) && triggerHoverEnd2(e, e.pointerType);
      }, {
        capture: !0
      }), onHoverStart && onHoverStart({
        type: "hoverstart",
        target,
        pointerType
      }), onHoverChange && onHoverChange(!0), setHovered(!0);
    }, triggerHoverEnd2 = (event, pointerType) => {
      let target = state.target;
      state.pointerType = "", state.target = null, !(pointerType === "touch" || !state.isHovered || !target) && (state.isHovered = !1, removeAllGlobalListeners(), onHoverEnd && onHoverEnd({
        type: "hoverend",
        target,
        pointerType
      }), onHoverChange && onHoverChange(!1), setHovered(!1));
    }, hoverProps2 = {};
    return typeof PointerEvent < "u" ? (hoverProps2.onPointerEnter = (e) => {
      $6179b936705e76d3$var$globalIgnoreEmulatedMouseEvents && e.pointerType === "mouse" || triggerHoverStart(e, e.pointerType);
    }, hoverProps2.onPointerLeave = (e) => {
      !isDisabled && e.currentTarget.contains(e.target) && triggerHoverEnd2(e, e.pointerType);
    }) : process.env.NODE_ENV === "test" && (hoverProps2.onTouchStart = () => {
      state.ignoreEmulatedMouseEvents = !0;
    }, hoverProps2.onMouseEnter = (e) => {
      !state.ignoreEmulatedMouseEvents && !$6179b936705e76d3$var$globalIgnoreEmulatedMouseEvents && triggerHoverStart(e, "mouse"), state.ignoreEmulatedMouseEvents = !1;
    }, hoverProps2.onMouseLeave = (e) => {
      !isDisabled && e.currentTarget.contains(e.target) && triggerHoverEnd2(e, "mouse");
    }), {
      hoverProps: hoverProps2,
      triggerHoverEnd: triggerHoverEnd2
    };
  }, [
    onHoverStart,
    onHoverChange,
    onHoverEnd,
    isDisabled,
    state,
    addGlobalListener,
    removeAllGlobalListeners
  ]);
  return $AWxnT$useEffect(() => {
    isDisabled && triggerHoverEnd({
      currentTarget: state.target
    }, state.pointerType);
  }, [
    isDisabled
  ]), {
    hoverProps,
    isHovered
  };
}

// ../node_modules/@react-aria/interactions/dist/useInteractOutside.mjs
import { useRef as $ispOf$useRef, useEffect as $ispOf$useEffect } from "react";
function $e0b6e0b68ec7f50f$export$872b660ac5a1ff98(props) {
  let { ref, onInteractOutside, isDisabled, onInteractOutsideStart } = props, stateRef = $ispOf$useRef({
    isPointerDown: !1,
    ignoreEmulatedMouseEvents: !1
  }), onPointerDown = $8ae05eaa5c114e9c$export$7f54fc3180508a52((e) => {
    onInteractOutside && $e0b6e0b68ec7f50f$var$isValidEvent(e, ref) && (onInteractOutsideStart && onInteractOutsideStart(e), stateRef.current.isPointerDown = !0);
  }), triggerInteractOutside = $8ae05eaa5c114e9c$export$7f54fc3180508a52((e) => {
    onInteractOutside && onInteractOutside(e);
  });
  $ispOf$useEffect(() => {
    let state = stateRef.current;
    if (isDisabled) return;
    let element = ref.current, documentObject = $431fbd86ca7dc216$export$b204af158042fbac(element);
    if (typeof PointerEvent < "u") {
      let onClick = (e) => {
        state.isPointerDown && $e0b6e0b68ec7f50f$var$isValidEvent(e, ref) && triggerInteractOutside(e), state.isPointerDown = !1;
      };
      return documentObject.addEventListener("pointerdown", onPointerDown, !0), documentObject.addEventListener("click", onClick, !0), () => {
        documentObject.removeEventListener("pointerdown", onPointerDown, !0), documentObject.removeEventListener("click", onClick, !0);
      };
    } else if (process.env.NODE_ENV === "test") {
      let onMouseUp = (e) => {
        state.ignoreEmulatedMouseEvents ? state.ignoreEmulatedMouseEvents = !1 : state.isPointerDown && $e0b6e0b68ec7f50f$var$isValidEvent(e, ref) && triggerInteractOutside(e), state.isPointerDown = !1;
      }, onTouchEnd = (e) => {
        state.ignoreEmulatedMouseEvents = !0, state.isPointerDown && $e0b6e0b68ec7f50f$var$isValidEvent(e, ref) && triggerInteractOutside(e), state.isPointerDown = !1;
      };
      return documentObject.addEventListener("mousedown", onPointerDown, !0), documentObject.addEventListener("mouseup", onMouseUp, !0), documentObject.addEventListener("touchstart", onPointerDown, !0), documentObject.addEventListener("touchend", onTouchEnd, !0), () => {
        documentObject.removeEventListener("mousedown", onPointerDown, !0), documentObject.removeEventListener("mouseup", onMouseUp, !0), documentObject.removeEventListener("touchstart", onPointerDown, !0), documentObject.removeEventListener("touchend", onTouchEnd, !0);
      };
    }
  }, [
    ref,
    isDisabled,
    onPointerDown,
    triggerInteractOutside
  ]);
}
function $e0b6e0b68ec7f50f$var$isValidEvent(event, ref) {
  if (event.button > 0) return !1;
  if (event.target) {
    let ownerDocument = event.target.ownerDocument;
    if (!ownerDocument || !ownerDocument.documentElement.contains(event.target) || event.target.closest("[data-react-aria-top-layer]")) return !1;
  }
  return ref.current ? !event.composedPath().includes(ref.current) : !1;
}

// ../node_modules/@react-aria/interactions/dist/useMove.mjs
import { useRef as $5GN7j$useRef, useMemo as $5GN7j$useMemo } from "react";

// ../node_modules/@react-aria/interactions/dist/useScrollWheel.mjs
import { useCallback as $nrdL2$useCallback } from "react";

// ../node_modules/@react-aria/interactions/dist/useLongPress.mjs
import { useRef as $4k2kv$useRef } from "react";
var $8a26561d2877236e$var$DEFAULT_THRESHOLD = 500;
function $8a26561d2877236e$export$c24ed0104d07eab9(props) {
  let { isDisabled, onLongPressStart, onLongPressEnd, onLongPress, threshold = $8a26561d2877236e$var$DEFAULT_THRESHOLD, accessibilityDescription } = props, timeRef = $4k2kv$useRef(void 0), { addGlobalListener, removeGlobalListener } = $03deb23ff14920c4$export$4eaf04e54aa8eed6(), { pressProps } = $f6c31cce2adf654f$export$45712eceda6fad21({
    isDisabled,
    onPressStart(e) {
      if (e.continuePropagation(), (e.pointerType === "mouse" || e.pointerType === "touch") && (onLongPressStart && onLongPressStart({
        ...e,
        type: "longpressstart"
      }), timeRef.current = setTimeout(() => {
        e.target.dispatchEvent(new PointerEvent("pointercancel", {
          bubbles: !0
        })), $431fbd86ca7dc216$export$b204af158042fbac(e.target).activeElement !== e.target && $7215afc6de606d6b$export$de79e2c695e052f3(e.target), onLongPress && onLongPress({
          ...e,
          type: "longpress"
        }), timeRef.current = void 0;
      }, threshold), e.pointerType === "touch")) {
        let onContextMenu = (e2) => {
          e2.preventDefault();
        };
        addGlobalListener(e.target, "contextmenu", onContextMenu, {
          once: !0
        }), addGlobalListener(window, "pointerup", () => {
          setTimeout(() => {
            removeGlobalListener(e.target, "contextmenu", onContextMenu);
          }, 30);
        }, {
          once: !0
        });
      }
    },
    onPressEnd(e) {
      timeRef.current && clearTimeout(timeRef.current), onLongPressEnd && (e.pointerType === "mouse" || e.pointerType === "touch") && onLongPressEnd({
        ...e,
        type: "longpressend"
      });
    }
  }), descriptionProps = $ef06256079686ba0$export$f8aeda7b10753fa1(onLongPress && !isDisabled ? accessibilityDescription : void 0);
  return {
    longPressProps: $3ef42575df84b30b$export$9d1611c77c2fe928(pressProps, descriptionProps)
  };
}

// ../node_modules/react-aria-components/dist/utils.mjs
import $iETbY$react, { useMemo as $iETbY$useMemo, useContext as $iETbY$useContext, useState as $iETbY$useState, useRef as $iETbY$useRef, useCallback as $iETbY$useCallback } from "react";
var $64fa3d84918910a7$export$c62b8e45d58ddad9 = Symbol("default");
function $64fa3d84918910a7$export$2881499e37b75b9a({ values, children }) {
  for (let [Context, value] of values)
    children = $iETbY$react.createElement(Context.Provider, {
      value
    }, children);
  return children;
}
function $64fa3d84918910a7$export$4d86445c2cf5e3(props) {
  let { className, style, children, defaultClassName, defaultChildren, defaultStyle, values } = props;
  return $iETbY$useMemo(() => {
    let computedClassName, computedStyle, computedChildren;
    return typeof className == "function" ? computedClassName = className({
      ...values,
      defaultClassName
    }) : computedClassName = className, typeof style == "function" ? computedStyle = style({
      ...values,
      defaultStyle: defaultStyle || {}
    }) : computedStyle = style, typeof children == "function" ? computedChildren = children({
      ...values,
      defaultChildren
    }) : children == null ? computedChildren = defaultChildren : computedChildren = children, {
      className: computedClassName ?? defaultClassName,
      style: computedStyle || defaultStyle ? {
        ...defaultStyle,
        ...computedStyle
      } : void 0,
      children: computedChildren ?? defaultChildren,
      "data-rac": ""
    };
  }, [
    className,
    style,
    children,
    defaultClassName,
    defaultChildren,
    defaultStyle,
    values
  ]);
}
function $64fa3d84918910a7$export$fabf2dc03a41866e(context, slot) {
  let ctx = $iETbY$useContext(context);
  if (slot === null)
    return null;
  if (ctx && typeof ctx == "object" && "slots" in ctx && ctx.slots) {
    let slotKey = slot || $64fa3d84918910a7$export$c62b8e45d58ddad9;
    if (!ctx.slots[slotKey]) {
      let availableSlots = new Intl.ListFormat().format(Object.keys(ctx.slots).map((p) => `"${p}"`)), errorMessage = slot ? `Invalid slot "${slot}".` : "A slot prop is required.";
      throw new Error(`${errorMessage} Valid slot names are ${availableSlots}.`);
    }
    return ctx.slots[slotKey];
  }
  return ctx;
}
function $64fa3d84918910a7$export$29f1550f4b0d4415(props, ref, context) {
  let ctx = $64fa3d84918910a7$export$fabf2dc03a41866e(context, props.slot) || {}, { ref: contextRef, ...contextProps } = ctx, mergedRef = $df56164dff5785e2$export$4338b53315abf666($iETbY$useMemo(() => $5dc95899b306f630$export$c9058316764c140e(ref, contextRef), [
    ref,
    contextRef
  ])), mergedProps = $3ef42575df84b30b$export$9d1611c77c2fe928(contextProps, props);
  return "style" in contextProps && contextProps.style && "style" in props && props.style && (typeof contextProps.style == "function" || typeof props.style == "function" ? mergedProps.style = (renderProps) => {
    let contextStyle = typeof contextProps.style == "function" ? contextProps.style(renderProps) : contextProps.style, defaultStyle = {
      ...renderProps.defaultStyle,
      ...contextStyle
    }, style = typeof props.style == "function" ? props.style({
      ...renderProps,
      defaultStyle
    }) : props.style;
    return {
      ...defaultStyle,
      ...style
    };
  } : mergedProps.style = {
    ...contextProps.style,
    ...props.style
  }), [
    mergedProps,
    mergedRef
  ];
}
function $64fa3d84918910a7$export$9d4c57ee4c6ffdd8(initialState = !0) {
  let [hasSlot, setHasSlot] = $iETbY$useState(initialState), hasRun = $iETbY$useRef(!1), ref = $iETbY$useCallback((el) => {
    hasRun.current = !0, setHasSlot(!!el);
  }, []);
  return $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => {
    hasRun.current || setHasSlot(!1);
  }, []), [
    ref,
    hasSlot
  ];
}

// ../node_modules/react-aria-components/dist/OverlayArrow.mjs
import $8wt2Z$react, { createContext as $8wt2Z$createContext, forwardRef as $8wt2Z$forwardRef } from "react";
var $44f671af83e7d9e0$export$2de4954e8ae13b9f = $8wt2Z$createContext({
  placement: "bottom"
}), $44f671af83e7d9e0$export$746d02f47f4d381 = $8wt2Z$forwardRef(function(props, ref) {
  [props, ref] = $64fa3d84918910a7$export$29f1550f4b0d4415(props, ref, $44f671af83e7d9e0$export$2de4954e8ae13b9f);
  let placement = props.placement, style = {
    position: "absolute",
    transform: placement === "top" || placement === "bottom" ? "translateX(-50%)" : "translateY(-50%)"
  };
  placement != null && (style[placement] = "100%");
  let renderProps = $64fa3d84918910a7$export$4d86445c2cf5e3({
    ...props,
    defaultClassName: "react-aria-OverlayArrow",
    values: {
      placement
    }
  });
  renderProps.style && Object.keys(renderProps.style).forEach((key) => renderProps.style[key] === void 0 && delete renderProps.style[key]);
  let DOMProps = $65484d02dcb7eb3e$export$457c3d6518dd4c6f(props);
  return $8wt2Z$react.createElement("div", {
    ...DOMProps,
    ...renderProps,
    style: {
      ...style,
      ...renderProps.style
    },
    ref,
    "data-placement": placement
  });
});

// ../node_modules/@react-aria/tooltip/dist/useTooltip.mjs
function $326e436e94273fe1$export$1c4b08e0eca38426(props, state) {
  let domProps = $65484d02dcb7eb3e$export$457c3d6518dd4c6f(props, {
    labelable: !0
  }), { hoverProps } = $6179b936705e76d3$export$ae780daf29e6d456({
    onHoverStart: () => state?.open(!0),
    onHoverEnd: () => state?.close()
  });
  return {
    tooltipProps: $3ef42575df84b30b$export$9d1611c77c2fe928(domProps, hoverProps, {
      role: "tooltip"
    })
  };
}

// ../node_modules/@react-aria/tooltip/dist/useTooltipTrigger.mjs
import { useRef as $6VwSn$useRef, useEffect as $6VwSn$useEffect } from "react";
function $4e1b34546679e357$export$a6da6c504e4bba8b(props, state, ref) {
  let { isDisabled, trigger } = props, tooltipId = $bdb11010cef70236$export$f680877a34711e37(), isHovered = $6VwSn$useRef(!1), isFocused = $6VwSn$useRef(!1), handleShow = () => {
    (isHovered.current || isFocused.current) && state.open(isFocused.current);
  }, handleHide = (immediate) => {
    !isHovered.current && !isFocused.current && state.close(immediate);
  };
  $6VwSn$useEffect(() => {
    let onKeyDown = (e) => {
      ref && ref.current && e.key === "Escape" && (e.stopPropagation(), state.close(!0));
    };
    if (state.isOpen)
      return document.addEventListener("keydown", onKeyDown, !0), () => {
        document.removeEventListener("keydown", onKeyDown, !0);
      };
  }, [
    ref,
    state
  ]);
  let onHoverStart = () => {
    trigger !== "focus" && ($507fabe10e71c6fb$export$630ff653c5ada6a9() === "pointer" ? isHovered.current = !0 : isHovered.current = !1, handleShow());
  }, onHoverEnd = () => {
    trigger !== "focus" && (isFocused.current = !1, isHovered.current = !1, handleHide());
  }, onPressStart = () => {
    isFocused.current = !1, isHovered.current = !1, handleHide(!0);
  }, onFocus = () => {
    $507fabe10e71c6fb$export$b9b3dfddab17db27() && (isFocused.current = !0, handleShow());
  }, onBlur = () => {
    isFocused.current = !1, isHovered.current = !1, handleHide(!0);
  }, { hoverProps } = $6179b936705e76d3$export$ae780daf29e6d456({
    isDisabled,
    onHoverStart,
    onHoverEnd
  }), { focusableProps } = $f645667febf57a63$export$4c014de7c8940b4c({
    isDisabled,
    onFocus,
    onBlur
  }, ref);
  return {
    triggerProps: {
      "aria-describedby": state.isOpen ? tooltipId : void 0,
      ...$3ef42575df84b30b$export$9d1611c77c2fe928(focusableProps, hoverProps, {
        onPointerDown: onPressStart,
        onKeyDown: onPressStart
      }),
      tabIndex: void 0
    },
    tooltipProps: {
      id: tooltipId
    }
  };
}

// ../node_modules/@react-aria/overlays/dist/calculatePosition.mjs
var $edcf132a9284368a$var$AXIS = {
  top: "top",
  bottom: "top",
  left: "left",
  right: "left"
}, $edcf132a9284368a$var$FLIPPED_DIRECTION = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left"
}, $edcf132a9284368a$var$CROSS_AXIS = {
  top: "left",
  left: "top"
}, $edcf132a9284368a$var$AXIS_SIZE = {
  top: "height",
  left: "width"
}, $edcf132a9284368a$var$TOTAL_SIZE = {
  width: "totalWidth",
  height: "totalHeight"
}, $edcf132a9284368a$var$PARSED_PLACEMENT_CACHE = {}, $edcf132a9284368a$var$visualViewport = typeof document < "u" ? window.visualViewport : null;
function $edcf132a9284368a$var$getContainerDimensions(containerNode) {
  let width = 0, height = 0, totalWidth = 0, totalHeight = 0, top = 0, left = 0, scroll = {};
  var _visualViewport_scale;
  let isPinchZoomedIn = ((_visualViewport_scale = $edcf132a9284368a$var$visualViewport?.scale) !== null && _visualViewport_scale !== void 0 ? _visualViewport_scale : 1) > 1;
  if (containerNode.tagName === "BODY") {
    let documentElement = document.documentElement;
    totalWidth = documentElement.clientWidth, totalHeight = documentElement.clientHeight;
    var _visualViewport_width;
    width = (_visualViewport_width = $edcf132a9284368a$var$visualViewport?.width) !== null && _visualViewport_width !== void 0 ? _visualViewport_width : totalWidth;
    var _visualViewport_height;
    height = (_visualViewport_height = $edcf132a9284368a$var$visualViewport?.height) !== null && _visualViewport_height !== void 0 ? _visualViewport_height : totalHeight, scroll.top = documentElement.scrollTop || containerNode.scrollTop, scroll.left = documentElement.scrollLeft || containerNode.scrollLeft, $edcf132a9284368a$var$visualViewport && (top = $edcf132a9284368a$var$visualViewport.offsetTop, left = $edcf132a9284368a$var$visualViewport.offsetLeft);
  } else
    ({ width, height, top, left } = $edcf132a9284368a$var$getOffset(containerNode, !1)), scroll.top = containerNode.scrollTop, scroll.left = containerNode.scrollLeft, totalWidth = width, totalHeight = height;
  if ($c87311424ea30a05$export$78551043582a6a98() && (containerNode.tagName === "BODY" || containerNode.tagName === "HTML") && isPinchZoomedIn) {
    scroll.top = 0, scroll.left = 0;
    var _visualViewport_pageTop;
    top = (_visualViewport_pageTop = $edcf132a9284368a$var$visualViewport?.pageTop) !== null && _visualViewport_pageTop !== void 0 ? _visualViewport_pageTop : 0;
    var _visualViewport_pageLeft;
    left = (_visualViewport_pageLeft = $edcf132a9284368a$var$visualViewport?.pageLeft) !== null && _visualViewport_pageLeft !== void 0 ? _visualViewport_pageLeft : 0;
  }
  return {
    width,
    height,
    totalWidth,
    totalHeight,
    scroll,
    top,
    left
  };
}
function $edcf132a9284368a$var$getScroll(node) {
  return {
    top: node.scrollTop,
    left: node.scrollLeft,
    width: node.scrollWidth,
    height: node.scrollHeight
  };
}
function $edcf132a9284368a$var$getDelta(axis, offset, size, boundaryDimensions, containerDimensions, padding, containerOffsetWithBoundary) {
  var _containerDimensions_scroll_axis;
  let containerScroll = (_containerDimensions_scroll_axis = containerDimensions.scroll[axis]) !== null && _containerDimensions_scroll_axis !== void 0 ? _containerDimensions_scroll_axis : 0, boundarySize = boundaryDimensions[$edcf132a9284368a$var$AXIS_SIZE[axis]], boundaryStartEdge = boundaryDimensions.scroll[$edcf132a9284368a$var$AXIS[axis]] + padding, boundaryEndEdge = boundarySize + boundaryDimensions.scroll[$edcf132a9284368a$var$AXIS[axis]] - padding, startEdgeOffset = offset - containerScroll + containerOffsetWithBoundary[axis] - boundaryDimensions[$edcf132a9284368a$var$AXIS[axis]], endEdgeOffset = offset - containerScroll + size + containerOffsetWithBoundary[axis] - boundaryDimensions[$edcf132a9284368a$var$AXIS[axis]];
  return startEdgeOffset < boundaryStartEdge ? boundaryStartEdge - startEdgeOffset : endEdgeOffset > boundaryEndEdge ? Math.max(boundaryEndEdge - endEdgeOffset, boundaryStartEdge - startEdgeOffset) : 0;
}
function $edcf132a9284368a$var$getMargins(node) {
  let style = window.getComputedStyle(node);
  return {
    top: parseInt(style.marginTop, 10) || 0,
    bottom: parseInt(style.marginBottom, 10) || 0,
    left: parseInt(style.marginLeft, 10) || 0,
    right: parseInt(style.marginRight, 10) || 0
  };
}
function $edcf132a9284368a$var$parsePlacement(input) {
  if ($edcf132a9284368a$var$PARSED_PLACEMENT_CACHE[input]) return $edcf132a9284368a$var$PARSED_PLACEMENT_CACHE[input];
  let [placement, crossPlacement] = input.split(" "), axis = $edcf132a9284368a$var$AXIS[placement] || "right", crossAxis = $edcf132a9284368a$var$CROSS_AXIS[axis];
  $edcf132a9284368a$var$AXIS[crossPlacement] || (crossPlacement = "center");
  let size = $edcf132a9284368a$var$AXIS_SIZE[axis], crossSize = $edcf132a9284368a$var$AXIS_SIZE[crossAxis];
  return $edcf132a9284368a$var$PARSED_PLACEMENT_CACHE[input] = {
    placement,
    crossPlacement,
    axis,
    crossAxis,
    size,
    crossSize
  }, $edcf132a9284368a$var$PARSED_PLACEMENT_CACHE[input];
}
function $edcf132a9284368a$var$computePosition(childOffset, boundaryDimensions, overlaySize, placementInfo, offset, crossOffset, containerOffsetWithBoundary, isContainerPositioned, arrowSize, arrowBoundaryOffset) {
  let { placement, crossPlacement, axis, crossAxis, size, crossSize } = placementInfo, position = {};
  var _childOffset_crossAxis;
  position[crossAxis] = (_childOffset_crossAxis = childOffset[crossAxis]) !== null && _childOffset_crossAxis !== void 0 ? _childOffset_crossAxis : 0;
  var _childOffset_crossSize, _overlaySize_crossSize, _childOffset_crossSize1, _overlaySize_crossSize1;
  crossPlacement === "center" ? position[crossAxis] += (((_childOffset_crossSize = childOffset[crossSize]) !== null && _childOffset_crossSize !== void 0 ? _childOffset_crossSize : 0) - ((_overlaySize_crossSize = overlaySize[crossSize]) !== null && _overlaySize_crossSize !== void 0 ? _overlaySize_crossSize : 0)) / 2 : crossPlacement !== crossAxis && (position[crossAxis] += ((_childOffset_crossSize1 = childOffset[crossSize]) !== null && _childOffset_crossSize1 !== void 0 ? _childOffset_crossSize1 : 0) - ((_overlaySize_crossSize1 = overlaySize[crossSize]) !== null && _overlaySize_crossSize1 !== void 0 ? _overlaySize_crossSize1 : 0)), position[crossAxis] += crossOffset;
  let minPosition = childOffset[crossAxis] - overlaySize[crossSize] + arrowSize + arrowBoundaryOffset, maxPosition = childOffset[crossAxis] + childOffset[crossSize] - arrowSize - arrowBoundaryOffset;
  if (position[crossAxis] = $9446cca9a3875146$export$7d15b64cf5a3a4c4(position[crossAxis], minPosition, maxPosition), placement === axis) {
    let containerHeight = isContainerPositioned ? containerOffsetWithBoundary[size] : boundaryDimensions[$edcf132a9284368a$var$TOTAL_SIZE[size]];
    position[$edcf132a9284368a$var$FLIPPED_DIRECTION[axis]] = Math.floor(containerHeight - childOffset[axis] + offset);
  } else position[axis] = Math.floor(childOffset[axis] + childOffset[size] + offset);
  return position;
}
function $edcf132a9284368a$var$getMaxHeight(position, boundaryDimensions, containerOffsetWithBoundary, isContainerPositioned, margins, padding, overlayHeight, heightGrowthDirection) {
  let containerHeight = isContainerPositioned ? containerOffsetWithBoundary.height : boundaryDimensions[$edcf132a9284368a$var$TOTAL_SIZE.height];
  var _position_bottom;
  let overlayTop = position.top != null ? containerOffsetWithBoundary.top + position.top : containerOffsetWithBoundary.top + (containerHeight - ((_position_bottom = position.bottom) !== null && _position_bottom !== void 0 ? _position_bottom : 0) - overlayHeight);
  var _boundaryDimensions_scroll_top, _margins_top, _margins_bottom, _boundaryDimensions_scroll_top1, _margins_top1, _margins_bottom1;
  let maxHeight = heightGrowthDirection !== "top" ? (
    // We want the distance between the top of the overlay to the bottom of the boundary
    Math.max(0, boundaryDimensions.height + boundaryDimensions.top + ((_boundaryDimensions_scroll_top = boundaryDimensions.scroll.top) !== null && _boundaryDimensions_scroll_top !== void 0 ? _boundaryDimensions_scroll_top : 0) - overlayTop - (((_margins_top = margins.top) !== null && _margins_top !== void 0 ? _margins_top : 0) + ((_margins_bottom = margins.bottom) !== null && _margins_bottom !== void 0 ? _margins_bottom : 0) + padding))
  ) : Math.max(0, overlayTop + overlayHeight - (boundaryDimensions.top + ((_boundaryDimensions_scroll_top1 = boundaryDimensions.scroll.top) !== null && _boundaryDimensions_scroll_top1 !== void 0 ? _boundaryDimensions_scroll_top1 : 0)) - (((_margins_top1 = margins.top) !== null && _margins_top1 !== void 0 ? _margins_top1 : 0) + ((_margins_bottom1 = margins.bottom) !== null && _margins_bottom1 !== void 0 ? _margins_bottom1 : 0) + padding));
  return Math.min(boundaryDimensions.height - padding * 2, maxHeight);
}
function $edcf132a9284368a$var$getAvailableSpace(boundaryDimensions, containerOffsetWithBoundary, childOffset, margins, padding, placementInfo) {
  let { placement, axis, size } = placementInfo;
  var _boundaryDimensions_scroll_axis, _margins_axis;
  if (placement === axis) return Math.max(0, childOffset[axis] - boundaryDimensions[axis] - ((_boundaryDimensions_scroll_axis = boundaryDimensions.scroll[axis]) !== null && _boundaryDimensions_scroll_axis !== void 0 ? _boundaryDimensions_scroll_axis : 0) + containerOffsetWithBoundary[axis] - ((_margins_axis = margins[axis]) !== null && _margins_axis !== void 0 ? _margins_axis : 0) - margins[$edcf132a9284368a$var$FLIPPED_DIRECTION[axis]] - padding);
  var _margins_axis1;
  return Math.max(0, boundaryDimensions[size] + boundaryDimensions[axis] + boundaryDimensions.scroll[axis] - containerOffsetWithBoundary[axis] - childOffset[axis] - childOffset[size] - ((_margins_axis1 = margins[axis]) !== null && _margins_axis1 !== void 0 ? _margins_axis1 : 0) - margins[$edcf132a9284368a$var$FLIPPED_DIRECTION[axis]] - padding);
}
function $edcf132a9284368a$export$6839422d1f33cee9(placementInput, childOffset, overlaySize, scrollSize, margins, padding, flip, boundaryDimensions, containerDimensions, containerOffsetWithBoundary, offset, crossOffset, isContainerPositioned, userSetMaxHeight, arrowSize, arrowBoundaryOffset) {
  let placementInfo = $edcf132a9284368a$var$parsePlacement(placementInput), { size, crossAxis, crossSize, placement, crossPlacement } = placementInfo, position = $edcf132a9284368a$var$computePosition(childOffset, boundaryDimensions, overlaySize, placementInfo, offset, crossOffset, containerOffsetWithBoundary, isContainerPositioned, arrowSize, arrowBoundaryOffset), normalizedOffset = offset, space = $edcf132a9284368a$var$getAvailableSpace(boundaryDimensions, containerOffsetWithBoundary, childOffset, margins, padding + offset, placementInfo);
  if (flip && scrollSize[size] > space) {
    let flippedPlacementInfo = $edcf132a9284368a$var$parsePlacement(`${$edcf132a9284368a$var$FLIPPED_DIRECTION[placement]} ${crossPlacement}`), flippedPosition = $edcf132a9284368a$var$computePosition(childOffset, boundaryDimensions, overlaySize, flippedPlacementInfo, offset, crossOffset, containerOffsetWithBoundary, isContainerPositioned, arrowSize, arrowBoundaryOffset);
    $edcf132a9284368a$var$getAvailableSpace(boundaryDimensions, containerOffsetWithBoundary, childOffset, margins, padding + offset, flippedPlacementInfo) > space && (placementInfo = flippedPlacementInfo, position = flippedPosition, normalizedOffset = offset);
  }
  let heightGrowthDirection = "bottom";
  placementInfo.axis === "top" ? placementInfo.placement === "top" ? heightGrowthDirection = "top" : placementInfo.placement === "bottom" && (heightGrowthDirection = "bottom") : placementInfo.crossAxis === "top" && (placementInfo.crossPlacement === "top" ? heightGrowthDirection = "bottom" : placementInfo.crossPlacement === "bottom" && (heightGrowthDirection = "top"));
  let delta = $edcf132a9284368a$var$getDelta(crossAxis, position[crossAxis], overlaySize[crossSize], boundaryDimensions, containerDimensions, padding, containerOffsetWithBoundary);
  position[crossAxis] += delta;
  let maxHeight = $edcf132a9284368a$var$getMaxHeight(position, boundaryDimensions, containerOffsetWithBoundary, isContainerPositioned, margins, padding, overlaySize.height, heightGrowthDirection);
  userSetMaxHeight && userSetMaxHeight < maxHeight && (maxHeight = userSetMaxHeight), overlaySize.height = Math.min(overlaySize.height, maxHeight), position = $edcf132a9284368a$var$computePosition(childOffset, boundaryDimensions, overlaySize, placementInfo, normalizedOffset, crossOffset, containerOffsetWithBoundary, isContainerPositioned, arrowSize, arrowBoundaryOffset), delta = $edcf132a9284368a$var$getDelta(crossAxis, position[crossAxis], overlaySize[crossSize], boundaryDimensions, containerDimensions, padding, containerOffsetWithBoundary), position[crossAxis] += delta;
  let arrowPosition = {}, origin = childOffset[crossAxis] - position[crossAxis] - margins[$edcf132a9284368a$var$AXIS[crossAxis]], preferredArrowPosition = origin + 0.5 * childOffset[crossSize], arrowMinPosition = arrowSize / 2 + arrowBoundaryOffset;
  var _margins_left, _margins_right, _margins_top, _margins_bottom;
  let overlayMargin = $edcf132a9284368a$var$AXIS[crossAxis] === "left" ? ((_margins_left = margins.left) !== null && _margins_left !== void 0 ? _margins_left : 0) + ((_margins_right = margins.right) !== null && _margins_right !== void 0 ? _margins_right : 0) : ((_margins_top = margins.top) !== null && _margins_top !== void 0 ? _margins_top : 0) + ((_margins_bottom = margins.bottom) !== null && _margins_bottom !== void 0 ? _margins_bottom : 0), arrowMaxPosition = overlaySize[crossSize] - overlayMargin - arrowSize / 2 - arrowBoundaryOffset, arrowOverlappingChildMinEdge = childOffset[crossAxis] + arrowSize / 2 - (position[crossAxis] + margins[$edcf132a9284368a$var$AXIS[crossAxis]]), arrowOverlappingChildMaxEdge = childOffset[crossAxis] + childOffset[crossSize] - arrowSize / 2 - (position[crossAxis] + margins[$edcf132a9284368a$var$AXIS[crossAxis]]), arrowPositionOverlappingChild = $9446cca9a3875146$export$7d15b64cf5a3a4c4(preferredArrowPosition, arrowOverlappingChildMinEdge, arrowOverlappingChildMaxEdge);
  arrowPosition[crossAxis] = $9446cca9a3875146$export$7d15b64cf5a3a4c4(arrowPositionOverlappingChild, arrowMinPosition, arrowMaxPosition), { placement, crossPlacement } = placementInfo, arrowSize ? origin = arrowPosition[crossAxis] : crossPlacement === "right" ? origin += childOffset[crossSize] : crossPlacement === "center" && (origin += childOffset[crossSize] / 2);
  let crossOrigin = placement === "left" || placement === "top" ? overlaySize[size] : 0, triggerAnchorPoint = {
    x: placement === "top" || placement === "bottom" ? origin : crossOrigin,
    y: placement === "left" || placement === "right" ? origin : crossOrigin
  };
  return {
    position,
    maxHeight,
    arrowOffsetLeft: arrowPosition.left,
    arrowOffsetTop: arrowPosition.top,
    placement,
    triggerAnchorPoint
  };
}
function $edcf132a9284368a$export$b3ceb0cbf1056d98(opts) {
  let { placement, targetNode, overlayNode, scrollNode, padding, shouldFlip, boundaryElement, offset, crossOffset, maxHeight, arrowSize = 0, arrowBoundaryOffset = 0 } = opts, container = overlayNode instanceof HTMLElement ? $edcf132a9284368a$var$getContainingBlock(overlayNode) : document.documentElement, isViewportContainer = container === document.documentElement, containerPositionStyle = window.getComputedStyle(container).position, isContainerPositioned = !!containerPositionStyle && containerPositionStyle !== "static", childOffset = isViewportContainer ? $edcf132a9284368a$var$getOffset(targetNode, !1) : $edcf132a9284368a$var$getPosition(targetNode, container, !1);
  if (!isViewportContainer) {
    let { marginTop, marginLeft } = window.getComputedStyle(targetNode);
    childOffset.top += parseInt(marginTop, 10) || 0, childOffset.left += parseInt(marginLeft, 10) || 0;
  }
  let overlaySize = $edcf132a9284368a$var$getOffset(overlayNode, !0), margins = $edcf132a9284368a$var$getMargins(overlayNode);
  var _margins_left, _margins_right;
  overlaySize.width += ((_margins_left = margins.left) !== null && _margins_left !== void 0 ? _margins_left : 0) + ((_margins_right = margins.right) !== null && _margins_right !== void 0 ? _margins_right : 0);
  var _margins_top, _margins_bottom;
  overlaySize.height += ((_margins_top = margins.top) !== null && _margins_top !== void 0 ? _margins_top : 0) + ((_margins_bottom = margins.bottom) !== null && _margins_bottom !== void 0 ? _margins_bottom : 0);
  let scrollSize = $edcf132a9284368a$var$getScroll(scrollNode), boundaryDimensions = $edcf132a9284368a$var$getContainerDimensions(boundaryElement), containerDimensions = $edcf132a9284368a$var$getContainerDimensions(container), containerOffsetWithBoundary = boundaryElement.tagName === "BODY" ? $edcf132a9284368a$var$getOffset(container, !1) : $edcf132a9284368a$var$getPosition(container, boundaryElement, !1);
  return container.tagName === "HTML" && boundaryElement.tagName === "BODY" && (containerDimensions.scroll.top = 0, containerDimensions.scroll.left = 0), $edcf132a9284368a$export$6839422d1f33cee9(placement, childOffset, overlaySize, scrollSize, margins, padding, shouldFlip, boundaryDimensions, containerDimensions, containerOffsetWithBoundary, offset, crossOffset, isContainerPositioned, maxHeight, arrowSize, arrowBoundaryOffset);
}
function $edcf132a9284368a$export$4b834cebd9e5cebe(node, ignoreScale) {
  let { top, left, width, height } = node.getBoundingClientRect();
  return ignoreScale && node instanceof node.ownerDocument.defaultView.HTMLElement && (width = node.offsetWidth, height = node.offsetHeight), {
    top,
    left,
    width,
    height
  };
}
function $edcf132a9284368a$var$getOffset(node, ignoreScale) {
  let { top, left, width, height } = $edcf132a9284368a$export$4b834cebd9e5cebe(node, ignoreScale), { scrollTop, scrollLeft, clientTop, clientLeft } = document.documentElement;
  return {
    top: top + scrollTop - clientTop,
    left: left + scrollLeft - clientLeft,
    width,
    height
  };
}
function $edcf132a9284368a$var$getPosition(node, parent, ignoreScale) {
  let style = window.getComputedStyle(node), offset;
  if (style.position === "fixed") offset = $edcf132a9284368a$export$4b834cebd9e5cebe(node, ignoreScale);
  else {
    offset = $edcf132a9284368a$var$getOffset(node, ignoreScale);
    let parentOffset = $edcf132a9284368a$var$getOffset(parent, ignoreScale), parentStyle = window.getComputedStyle(parent);
    parentOffset.top += (parseInt(parentStyle.borderTopWidth, 10) || 0) - parent.scrollTop, parentOffset.left += (parseInt(parentStyle.borderLeftWidth, 10) || 0) - parent.scrollLeft, offset.top -= parentOffset.top, offset.left -= parentOffset.left;
  }
  return offset.top -= parseInt(style.marginTop, 10) || 0, offset.left -= parseInt(style.marginLeft, 10) || 0, offset;
}
function $edcf132a9284368a$var$getContainingBlock(node) {
  let offsetParent = node.offsetParent;
  if (offsetParent && offsetParent === document.body && window.getComputedStyle(offsetParent).position === "static" && !$edcf132a9284368a$var$isContainingBlock(offsetParent) && (offsetParent = document.documentElement), offsetParent == null)
    for (offsetParent = node.parentElement; offsetParent && !$edcf132a9284368a$var$isContainingBlock(offsetParent); ) offsetParent = offsetParent.parentElement;
  return offsetParent || document.documentElement;
}
function $edcf132a9284368a$var$isContainingBlock(node) {
  let style = window.getComputedStyle(node);
  return style.transform !== "none" || /transform|perspective/.test(style.willChange) || style.filter !== "none" || style.contain === "paint" || "backdropFilter" in style && style.backdropFilter !== "none" || "WebkitBackdropFilter" in style && style.WebkitBackdropFilter !== "none";
}

// ../node_modules/@react-aria/overlays/dist/useCloseOnScroll.mjs
import { useEffect as $dRVb8$useEffect } from "react";
var $dd149f63282afbbf$export$f6211563215e3b37 = /* @__PURE__ */ new WeakMap();
function $dd149f63282afbbf$export$18fc8428861184da(opts) {
  let { triggerRef, isOpen, onClose } = opts;
  $dRVb8$useEffect(() => {
    if (!isOpen || onClose === null) return;
    let onScroll = (e) => {
      let target = e.target;
      if (!triggerRef.current || target instanceof Node && !target.contains(triggerRef.current) || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      let onCloseHandler = onClose || $dd149f63282afbbf$export$f6211563215e3b37.get(triggerRef.current);
      onCloseHandler && onCloseHandler();
    };
    return window.addEventListener("scroll", onScroll, !0), () => {
      window.removeEventListener("scroll", onScroll, !0);
    };
  }, [
    isOpen,
    onClose,
    triggerRef
  ]);
}

// ../node_modules/@react-aria/overlays/dist/useOverlayPosition.mjs
import { useState as $39EOa$useState, useRef as $39EOa$useRef, useEffect as $39EOa$useEffect, useCallback as $39EOa$useCallback } from "react";

// ../node_modules/@react-aria/i18n/dist/utils.mjs
var $148a7a147e38ea7f$var$RTL_SCRIPTS = /* @__PURE__ */ new Set([
  "Arab",
  "Syrc",
  "Samr",
  "Mand",
  "Thaa",
  "Mend",
  "Nkoo",
  "Adlm",
  "Rohg",
  "Hebr"
]), $148a7a147e38ea7f$var$RTL_LANGS = /* @__PURE__ */ new Set([
  "ae",
  "ar",
  "arc",
  "bcc",
  "bqi",
  "ckb",
  "dv",
  "fa",
  "glk",
  "he",
  "ku",
  "mzn",
  "nqo",
  "pnb",
  "ps",
  "sd",
  "ug",
  "ur",
  "yi"
]);
function $148a7a147e38ea7f$export$702d680b21cbd764(localeString) {
  if (Intl.Locale) {
    let locale = new Intl.Locale(localeString).maximize(), textInfo = typeof locale.getTextInfo == "function" ? locale.getTextInfo() : locale.textInfo;
    if (textInfo) return textInfo.direction === "rtl";
    if (locale.script) return $148a7a147e38ea7f$var$RTL_SCRIPTS.has(locale.script);
  }
  let lang = localeString.split("-")[0];
  return $148a7a147e38ea7f$var$RTL_LANGS.has(lang);
}

// ../node_modules/@react-aria/i18n/dist/useDefaultLocale.mjs
import { useState as $ffhGL$useState, useEffect as $ffhGL$useEffect } from "react";
var $1e5a04cdaf7d1af8$var$localeSymbol = Symbol.for("react-aria.i18n.locale");
function $1e5a04cdaf7d1af8$export$f09106e7c6677ec5() {
  let locale = typeof window < "u" && window[$1e5a04cdaf7d1af8$var$localeSymbol] || typeof navigator < "u" && (navigator.language || navigator.userLanguage) || "en-US";
  try {
    Intl.DateTimeFormat.supportedLocalesOf([
      locale
    ]);
  } catch {
    locale = "en-US";
  }
  return {
    locale,
    direction: $148a7a147e38ea7f$export$702d680b21cbd764(locale) ? "rtl" : "ltr"
  };
}
var $1e5a04cdaf7d1af8$var$currentLocale = $1e5a04cdaf7d1af8$export$f09106e7c6677ec5(), $1e5a04cdaf7d1af8$var$listeners = /* @__PURE__ */ new Set();
function $1e5a04cdaf7d1af8$var$updateLocale() {
  $1e5a04cdaf7d1af8$var$currentLocale = $1e5a04cdaf7d1af8$export$f09106e7c6677ec5();
  for (let listener of $1e5a04cdaf7d1af8$var$listeners) listener($1e5a04cdaf7d1af8$var$currentLocale);
}
function $1e5a04cdaf7d1af8$export$188ec29ebc2bdc3a() {
  let isSSR = $b5e257d569688ac6$export$535bd6ca7f90a273(), [defaultLocale, setDefaultLocale] = $ffhGL$useState($1e5a04cdaf7d1af8$var$currentLocale);
  return $ffhGL$useEffect(() => ($1e5a04cdaf7d1af8$var$listeners.size === 0 && window.addEventListener("languagechange", $1e5a04cdaf7d1af8$var$updateLocale), $1e5a04cdaf7d1af8$var$listeners.add(setDefaultLocale), () => {
    $1e5a04cdaf7d1af8$var$listeners.delete(setDefaultLocale), $1e5a04cdaf7d1af8$var$listeners.size === 0 && window.removeEventListener("languagechange", $1e5a04cdaf7d1af8$var$updateLocale);
  }), []), isSSR ? {
    locale: "en-US",
    direction: "ltr"
  } : defaultLocale;
}

// ../node_modules/@react-aria/i18n/dist/context.mjs
import $h9FiU$react, { useContext as $h9FiU$useContext } from "react";
var $18f2051aff69b9bf$var$I18nContext = $h9FiU$react.createContext(null);
function $18f2051aff69b9bf$export$43bb16f9c6d9e3f7() {
  let defaultLocale = $1e5a04cdaf7d1af8$export$188ec29ebc2bdc3a();
  return $h9FiU$useContext($18f2051aff69b9bf$var$I18nContext) || defaultLocale;
}

// ../node_modules/tslib/tslib.es6.mjs
var extendStatics = function(d, b) {
  return extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
    d2.__proto__ = b2;
  } || function(d2, b2) {
    for (var p in b2) Object.prototype.hasOwnProperty.call(b2, p) && (d2[p] = b2[p]);
  }, extendStatics(d, b);
};
function __extends(d, b) {
  if (typeof b != "function" && b !== null)
    throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
  extendStatics(d, b);
  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
var __assign = function() {
  return __assign = Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) Object.prototype.hasOwnProperty.call(s, p) && (t[p] = s[p]);
    }
    return t;
  }, __assign.apply(this, arguments);
};
function __rest(s, e) {
  var t = {};
  for (var p in s) Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0 && (t[p] = s[p]);
  if (s != null && typeof Object.getOwnPropertySymbols == "function")
    for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++)
      e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]) && (t[p[i]] = s[p[i]]);
  return t;
}
function __spreadArray(to, from, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++)
    (ar || !(i in from)) && (ar || (ar = Array.prototype.slice.call(from, 0, i)), ar[i] = from[i]);
  return to.concat(ar || Array.prototype.slice.call(from));
}

// ../node_modules/@formatjs/fast-memoize/lib/index.js
function memoize(fn, options) {
  var cache = options && options.cache ? options.cache : cacheDefault, serializer = options && options.serializer ? options.serializer : serializerDefault, strategy = options && options.strategy ? options.strategy : strategyDefault;
  return strategy(fn, {
    cache,
    serializer
  });
}
function isPrimitive(value) {
  return value == null || typeof value == "number" || typeof value == "boolean";
}
function monadic(fn, cache, serializer, arg) {
  var cacheKey = isPrimitive(arg) ? arg : serializer(arg), computedValue = cache.get(cacheKey);
  return typeof computedValue > "u" && (computedValue = fn.call(this, arg), cache.set(cacheKey, computedValue)), computedValue;
}
function variadic(fn, cache, serializer) {
  var args = Array.prototype.slice.call(arguments, 3), cacheKey = serializer(args), computedValue = cache.get(cacheKey);
  return typeof computedValue > "u" && (computedValue = fn.apply(this, args), cache.set(cacheKey, computedValue)), computedValue;
}
function assemble(fn, context, strategy, cache, serialize) {
  return strategy.bind(context, fn, cache, serialize);
}
function strategyDefault(fn, options) {
  var strategy = fn.length === 1 ? monadic : variadic;
  return assemble(fn, this, strategy, options.cache.create(), options.serializer);
}
function strategyVariadic(fn, options) {
  return assemble(fn, this, variadic, options.cache.create(), options.serializer);
}
function strategyMonadic(fn, options) {
  return assemble(fn, this, monadic, options.cache.create(), options.serializer);
}
var serializerDefault = function() {
  return JSON.stringify(arguments);
}, ObjectWithoutPrototypeCache = (
  /** @class */
  (function() {
    function ObjectWithoutPrototypeCache2() {
      this.cache = /* @__PURE__ */ Object.create(null);
    }
    return ObjectWithoutPrototypeCache2.prototype.get = function(key) {
      return this.cache[key];
    }, ObjectWithoutPrototypeCache2.prototype.set = function(key, value) {
      this.cache[key] = value;
    }, ObjectWithoutPrototypeCache2;
  })()
), cacheDefault = {
  create: function() {
    return new ObjectWithoutPrototypeCache();
  }
}, strategies = {
  variadic: strategyVariadic,
  monadic: strategyMonadic
};

// ../node_modules/@formatjs/icu-messageformat-parser/lib/error.js
var ErrorKind;
(function(ErrorKind2) {
  ErrorKind2[ErrorKind2.EXPECT_ARGUMENT_CLOSING_BRACE = 1] = "EXPECT_ARGUMENT_CLOSING_BRACE", ErrorKind2[ErrorKind2.EMPTY_ARGUMENT = 2] = "EMPTY_ARGUMENT", ErrorKind2[ErrorKind2.MALFORMED_ARGUMENT = 3] = "MALFORMED_ARGUMENT", ErrorKind2[ErrorKind2.EXPECT_ARGUMENT_TYPE = 4] = "EXPECT_ARGUMENT_TYPE", ErrorKind2[ErrorKind2.INVALID_ARGUMENT_TYPE = 5] = "INVALID_ARGUMENT_TYPE", ErrorKind2[ErrorKind2.EXPECT_ARGUMENT_STYLE = 6] = "EXPECT_ARGUMENT_STYLE", ErrorKind2[ErrorKind2.INVALID_NUMBER_SKELETON = 7] = "INVALID_NUMBER_SKELETON", ErrorKind2[ErrorKind2.INVALID_DATE_TIME_SKELETON = 8] = "INVALID_DATE_TIME_SKELETON", ErrorKind2[ErrorKind2.EXPECT_NUMBER_SKELETON = 9] = "EXPECT_NUMBER_SKELETON", ErrorKind2[ErrorKind2.EXPECT_DATE_TIME_SKELETON = 10] = "EXPECT_DATE_TIME_SKELETON", ErrorKind2[ErrorKind2.UNCLOSED_QUOTE_IN_ARGUMENT_STYLE = 11] = "UNCLOSED_QUOTE_IN_ARGUMENT_STYLE", ErrorKind2[ErrorKind2.EXPECT_SELECT_ARGUMENT_OPTIONS = 12] = "EXPECT_SELECT_ARGUMENT_OPTIONS", ErrorKind2[ErrorKind2.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE = 13] = "EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE", ErrorKind2[ErrorKind2.INVALID_PLURAL_ARGUMENT_OFFSET_VALUE = 14] = "INVALID_PLURAL_ARGUMENT_OFFSET_VALUE", ErrorKind2[ErrorKind2.EXPECT_SELECT_ARGUMENT_SELECTOR = 15] = "EXPECT_SELECT_ARGUMENT_SELECTOR", ErrorKind2[ErrorKind2.EXPECT_PLURAL_ARGUMENT_SELECTOR = 16] = "EXPECT_PLURAL_ARGUMENT_SELECTOR", ErrorKind2[ErrorKind2.EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT = 17] = "EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT", ErrorKind2[ErrorKind2.EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT = 18] = "EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT", ErrorKind2[ErrorKind2.INVALID_PLURAL_ARGUMENT_SELECTOR = 19] = "INVALID_PLURAL_ARGUMENT_SELECTOR", ErrorKind2[ErrorKind2.DUPLICATE_PLURAL_ARGUMENT_SELECTOR = 20] = "DUPLICATE_PLURAL_ARGUMENT_SELECTOR", ErrorKind2[ErrorKind2.DUPLICATE_SELECT_ARGUMENT_SELECTOR = 21] = "DUPLICATE_SELECT_ARGUMENT_SELECTOR", ErrorKind2[ErrorKind2.MISSING_OTHER_CLAUSE = 22] = "MISSING_OTHER_CLAUSE", ErrorKind2[ErrorKind2.INVALID_TAG = 23] = "INVALID_TAG", ErrorKind2[ErrorKind2.INVALID_TAG_NAME = 25] = "INVALID_TAG_NAME", ErrorKind2[ErrorKind2.UNMATCHED_CLOSING_TAG = 26] = "UNMATCHED_CLOSING_TAG", ErrorKind2[ErrorKind2.UNCLOSED_TAG = 27] = "UNCLOSED_TAG";
})(ErrorKind || (ErrorKind = {}));

// ../node_modules/@formatjs/icu-messageformat-parser/lib/types.js
var TYPE;
(function(TYPE2) {
  TYPE2[TYPE2.literal = 0] = "literal", TYPE2[TYPE2.argument = 1] = "argument", TYPE2[TYPE2.number = 2] = "number", TYPE2[TYPE2.date = 3] = "date", TYPE2[TYPE2.time = 4] = "time", TYPE2[TYPE2.select = 5] = "select", TYPE2[TYPE2.plural = 6] = "plural", TYPE2[TYPE2.pound = 7] = "pound", TYPE2[TYPE2.tag = 8] = "tag";
})(TYPE || (TYPE = {}));
var SKELETON_TYPE;
(function(SKELETON_TYPE2) {
  SKELETON_TYPE2[SKELETON_TYPE2.number = 0] = "number", SKELETON_TYPE2[SKELETON_TYPE2.dateTime = 1] = "dateTime";
})(SKELETON_TYPE || (SKELETON_TYPE = {}));
function isLiteralElement(el) {
  return el.type === TYPE.literal;
}
function isArgumentElement(el) {
  return el.type === TYPE.argument;
}
function isNumberElement(el) {
  return el.type === TYPE.number;
}
function isDateElement(el) {
  return el.type === TYPE.date;
}
function isTimeElement(el) {
  return el.type === TYPE.time;
}
function isSelectElement(el) {
  return el.type === TYPE.select;
}
function isPluralElement(el) {
  return el.type === TYPE.plural;
}
function isPoundElement(el) {
  return el.type === TYPE.pound;
}
function isTagElement(el) {
  return el.type === TYPE.tag;
}
function isNumberSkeleton(el) {
  return !!(el && typeof el == "object" && el.type === SKELETON_TYPE.number);
}
function isDateTimeSkeleton(el) {
  return !!(el && typeof el == "object" && el.type === SKELETON_TYPE.dateTime);
}

// ../node_modules/@formatjs/icu-messageformat-parser/lib/regex.generated.js
var SPACE_SEPARATOR_REGEX = /[ \xA0\u1680\u2000-\u200A\u202F\u205F\u3000]/;

// ../node_modules/@formatjs/icu-skeleton-parser/lib/date-time.js
var DATE_TIME_REGEX = /(?:[Eec]{1,6}|G{1,5}|[Qq]{1,5}|(?:[yYur]+|U{1,5})|[ML]{1,5}|d{1,2}|D{1,3}|F{1}|[abB]{1,5}|[hkHK]{1,2}|w{1,2}|W{1}|m{1,2}|s{1,2}|[zZOvVxX]{1,4})(?=([^']*'[^']*')*[^']*$)/g;
function parseDateTimeSkeleton(skeleton) {
  var result = {};
  return skeleton.replace(DATE_TIME_REGEX, function(match) {
    var len = match.length;
    switch (match[0]) {
      // Era
      case "G":
        result.era = len === 4 ? "long" : len === 5 ? "narrow" : "short";
        break;
      // Year
      case "y":
        result.year = len === 2 ? "2-digit" : "numeric";
        break;
      case "Y":
      case "u":
      case "U":
      case "r":
        throw new RangeError("`Y/u/U/r` (year) patterns are not supported, use `y` instead");
      // Quarter
      case "q":
      case "Q":
        throw new RangeError("`q/Q` (quarter) patterns are not supported");
      // Month
      case "M":
      case "L":
        result.month = ["numeric", "2-digit", "short", "long", "narrow"][len - 1];
        break;
      // Week
      case "w":
      case "W":
        throw new RangeError("`w/W` (week) patterns are not supported");
      case "d":
        result.day = ["numeric", "2-digit"][len - 1];
        break;
      case "D":
      case "F":
      case "g":
        throw new RangeError("`D/F/g` (day) patterns are not supported, use `d` instead");
      // Weekday
      case "E":
        result.weekday = len === 4 ? "long" : len === 5 ? "narrow" : "short";
        break;
      case "e":
        if (len < 4)
          throw new RangeError("`e..eee` (weekday) patterns are not supported");
        result.weekday = ["short", "long", "narrow", "short"][len - 4];
        break;
      case "c":
        if (len < 4)
          throw new RangeError("`c..ccc` (weekday) patterns are not supported");
        result.weekday = ["short", "long", "narrow", "short"][len - 4];
        break;
      // Period
      case "a":
        result.hour12 = !0;
        break;
      case "b":
      // am, pm, noon, midnight
      case "B":
        throw new RangeError("`b/B` (period) patterns are not supported, use `a` instead");
      // Hour
      case "h":
        result.hourCycle = "h12", result.hour = ["numeric", "2-digit"][len - 1];
        break;
      case "H":
        result.hourCycle = "h23", result.hour = ["numeric", "2-digit"][len - 1];
        break;
      case "K":
        result.hourCycle = "h11", result.hour = ["numeric", "2-digit"][len - 1];
        break;
      case "k":
        result.hourCycle = "h24", result.hour = ["numeric", "2-digit"][len - 1];
        break;
      case "j":
      case "J":
      case "C":
        throw new RangeError("`j/J/C` (hour) patterns are not supported, use `h/H/K/k` instead");
      // Minute
      case "m":
        result.minute = ["numeric", "2-digit"][len - 1];
        break;
      // Second
      case "s":
        result.second = ["numeric", "2-digit"][len - 1];
        break;
      case "S":
      case "A":
        throw new RangeError("`S/A` (second) patterns are not supported, use `s` instead");
      // Zone
      case "z":
        result.timeZoneName = len < 4 ? "short" : "long";
        break;
      case "Z":
      // 1..3, 4, 5: The ISO8601 varios formats
      case "O":
      // 1, 4: milliseconds in day short, long
      case "v":
      // 1, 4: generic non-location format
      case "V":
      // 1, 2, 3, 4: time zone ID or city
      case "X":
      // 1, 2, 3, 4: The ISO8601 varios formats
      case "x":
        throw new RangeError("`Z/O/v/V/X/x` (timeZone) patterns are not supported, use `z` instead");
    }
    return "";
  }), result;
}

// ../node_modules/@formatjs/icu-skeleton-parser/lib/regex.generated.js
var WHITE_SPACE_REGEX = /[\t-\r \x85\u200E\u200F\u2028\u2029]/i;

// ../node_modules/@formatjs/icu-skeleton-parser/lib/number.js
function parseNumberSkeletonFromString(skeleton) {
  if (skeleton.length === 0)
    throw new Error("Number skeleton cannot be empty");
  for (var stringTokens = skeleton.split(WHITE_SPACE_REGEX).filter(function(x) {
    return x.length > 0;
  }), tokens = [], _i = 0, stringTokens_1 = stringTokens; _i < stringTokens_1.length; _i++) {
    var stringToken = stringTokens_1[_i], stemAndOptions = stringToken.split("/");
    if (stemAndOptions.length === 0)
      throw new Error("Invalid number skeleton");
    for (var stem = stemAndOptions[0], options = stemAndOptions.slice(1), _a2 = 0, options_1 = options; _a2 < options_1.length; _a2++) {
      var option = options_1[_a2];
      if (option.length === 0)
        throw new Error("Invalid number skeleton");
    }
    tokens.push({ stem, options });
  }
  return tokens;
}
function icuUnitToEcma(unit) {
  return unit.replace(/^(.*?)-/, "");
}
var FRACTION_PRECISION_REGEX = /^\.(?:(0+)(\*)?|(#+)|(0+)(#+))$/g, SIGNIFICANT_PRECISION_REGEX = /^(@+)?(\+|#+)?[rs]?$/g, INTEGER_WIDTH_REGEX = /(\*)(0+)|(#+)(0+)|(0+)/g, CONCISE_INTEGER_WIDTH_REGEX = /^(0+)$/;
function parseSignificantPrecision(str) {
  var result = {};
  return str[str.length - 1] === "r" ? result.roundingPriority = "morePrecision" : str[str.length - 1] === "s" && (result.roundingPriority = "lessPrecision"), str.replace(SIGNIFICANT_PRECISION_REGEX, function(_, g1, g2) {
    return typeof g2 != "string" ? (result.minimumSignificantDigits = g1.length, result.maximumSignificantDigits = g1.length) : g2 === "+" ? result.minimumSignificantDigits = g1.length : g1[0] === "#" ? result.maximumSignificantDigits = g1.length : (result.minimumSignificantDigits = g1.length, result.maximumSignificantDigits = g1.length + (typeof g2 == "string" ? g2.length : 0)), "";
  }), result;
}
function parseSign(str) {
  switch (str) {
    case "sign-auto":
      return {
        signDisplay: "auto"
      };
    case "sign-accounting":
    case "()":
      return {
        currencySign: "accounting"
      };
    case "sign-always":
    case "+!":
      return {
        signDisplay: "always"
      };
    case "sign-accounting-always":
    case "()!":
      return {
        signDisplay: "always",
        currencySign: "accounting"
      };
    case "sign-except-zero":
    case "+?":
      return {
        signDisplay: "exceptZero"
      };
    case "sign-accounting-except-zero":
    case "()?":
      return {
        signDisplay: "exceptZero",
        currencySign: "accounting"
      };
    case "sign-never":
    case "+_":
      return {
        signDisplay: "never"
      };
  }
}
function parseConciseScientificAndEngineeringStem(stem) {
  var result;
  if (stem[0] === "E" && stem[1] === "E" ? (result = {
    notation: "engineering"
  }, stem = stem.slice(2)) : stem[0] === "E" && (result = {
    notation: "scientific"
  }, stem = stem.slice(1)), result) {
    var signDisplay = stem.slice(0, 2);
    if (signDisplay === "+!" ? (result.signDisplay = "always", stem = stem.slice(2)) : signDisplay === "+?" && (result.signDisplay = "exceptZero", stem = stem.slice(2)), !CONCISE_INTEGER_WIDTH_REGEX.test(stem))
      throw new Error("Malformed concise eng/scientific notation");
    result.minimumIntegerDigits = stem.length;
  }
  return result;
}
function parseNotationOptions(opt) {
  var result = {}, signOpts = parseSign(opt);
  return signOpts || result;
}
function parseNumberSkeleton(tokens) {
  for (var result = {}, _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    switch (token.stem) {
      case "percent":
      case "%":
        result.style = "percent";
        continue;
      case "%x100":
        result.style = "percent", result.scale = 100;
        continue;
      case "currency":
        result.style = "currency", result.currency = token.options[0];
        continue;
      case "group-off":
      case ",_":
        result.useGrouping = !1;
        continue;
      case "precision-integer":
      case ".":
        result.maximumFractionDigits = 0;
        continue;
      case "measure-unit":
      case "unit":
        result.style = "unit", result.unit = icuUnitToEcma(token.options[0]);
        continue;
      case "compact-short":
      case "K":
        result.notation = "compact", result.compactDisplay = "short";
        continue;
      case "compact-long":
      case "KK":
        result.notation = "compact", result.compactDisplay = "long";
        continue;
      case "scientific":
        result = __assign(__assign(__assign({}, result), { notation: "scientific" }), token.options.reduce(function(all, opt2) {
          return __assign(__assign({}, all), parseNotationOptions(opt2));
        }, {}));
        continue;
      case "engineering":
        result = __assign(__assign(__assign({}, result), { notation: "engineering" }), token.options.reduce(function(all, opt2) {
          return __assign(__assign({}, all), parseNotationOptions(opt2));
        }, {}));
        continue;
      case "notation-simple":
        result.notation = "standard";
        continue;
      // https://github.com/unicode-org/icu/blob/master/icu4c/source/i18n/unicode/unumberformatter.h
      case "unit-width-narrow":
        result.currencyDisplay = "narrowSymbol", result.unitDisplay = "narrow";
        continue;
      case "unit-width-short":
        result.currencyDisplay = "code", result.unitDisplay = "short";
        continue;
      case "unit-width-full-name":
        result.currencyDisplay = "name", result.unitDisplay = "long";
        continue;
      case "unit-width-iso-code":
        result.currencyDisplay = "symbol";
        continue;
      case "scale":
        result.scale = parseFloat(token.options[0]);
        continue;
      case "rounding-mode-floor":
        result.roundingMode = "floor";
        continue;
      case "rounding-mode-ceiling":
        result.roundingMode = "ceil";
        continue;
      case "rounding-mode-down":
        result.roundingMode = "trunc";
        continue;
      case "rounding-mode-up":
        result.roundingMode = "expand";
        continue;
      case "rounding-mode-half-even":
        result.roundingMode = "halfEven";
        continue;
      case "rounding-mode-half-down":
        result.roundingMode = "halfTrunc";
        continue;
      case "rounding-mode-half-up":
        result.roundingMode = "halfExpand";
        continue;
      // https://unicode-org.github.io/icu/userguide/format_parse/numbers/skeletons.html#integer-width
      case "integer-width":
        if (token.options.length > 1)
          throw new RangeError("integer-width stems only accept a single optional option");
        token.options[0].replace(INTEGER_WIDTH_REGEX, function(_, g1, g2, g3, g4, g5) {
          if (g1)
            result.minimumIntegerDigits = g2.length;
          else {
            if (g3 && g4)
              throw new Error("We currently do not support maximum integer digits");
            if (g5)
              throw new Error("We currently do not support exact integer digits");
          }
          return "";
        });
        continue;
    }
    if (CONCISE_INTEGER_WIDTH_REGEX.test(token.stem)) {
      result.minimumIntegerDigits = token.stem.length;
      continue;
    }
    if (FRACTION_PRECISION_REGEX.test(token.stem)) {
      if (token.options.length > 1)
        throw new RangeError("Fraction-precision stems only accept a single optional option");
      token.stem.replace(FRACTION_PRECISION_REGEX, function(_, g1, g2, g3, g4, g5) {
        return g2 === "*" ? result.minimumFractionDigits = g1.length : g3 && g3[0] === "#" ? result.maximumFractionDigits = g3.length : g4 && g5 ? (result.minimumFractionDigits = g4.length, result.maximumFractionDigits = g4.length + g5.length) : (result.minimumFractionDigits = g1.length, result.maximumFractionDigits = g1.length), "";
      });
      var opt = token.options[0];
      opt === "w" ? result = __assign(__assign({}, result), { trailingZeroDisplay: "stripIfInteger" }) : opt && (result = __assign(__assign({}, result), parseSignificantPrecision(opt)));
      continue;
    }
    if (SIGNIFICANT_PRECISION_REGEX.test(token.stem)) {
      result = __assign(__assign({}, result), parseSignificantPrecision(token.stem));
      continue;
    }
    var signOpts = parseSign(token.stem);
    signOpts && (result = __assign(__assign({}, result), signOpts));
    var conciseScientificAndEngineeringOpts = parseConciseScientificAndEngineeringStem(token.stem);
    conciseScientificAndEngineeringOpts && (result = __assign(__assign({}, result), conciseScientificAndEngineeringOpts));
  }
  return result;
}

// ../node_modules/@formatjs/icu-messageformat-parser/lib/time-data.generated.js
var timeData = {
  "001": [
    "H",
    "h"
  ],
  419: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  AC: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  AD: [
    "H",
    "hB"
  ],
  AE: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  AF: [
    "H",
    "hb",
    "hB",
    "h"
  ],
  AG: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  AI: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  AL: [
    "h",
    "H",
    "hB"
  ],
  AM: [
    "H",
    "hB"
  ],
  AO: [
    "H",
    "hB"
  ],
  AR: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  AS: [
    "h",
    "H"
  ],
  AT: [
    "H",
    "hB"
  ],
  AU: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  AW: [
    "H",
    "hB"
  ],
  AX: [
    "H"
  ],
  AZ: [
    "H",
    "hB",
    "h"
  ],
  BA: [
    "H",
    "hB",
    "h"
  ],
  BB: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  BD: [
    "h",
    "hB",
    "H"
  ],
  BE: [
    "H",
    "hB"
  ],
  BF: [
    "H",
    "hB"
  ],
  BG: [
    "H",
    "hB",
    "h"
  ],
  BH: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  BI: [
    "H",
    "h"
  ],
  BJ: [
    "H",
    "hB"
  ],
  BL: [
    "H",
    "hB"
  ],
  BM: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  BN: [
    "hb",
    "hB",
    "h",
    "H"
  ],
  BO: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  BQ: [
    "H"
  ],
  BR: [
    "H",
    "hB"
  ],
  BS: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  BT: [
    "h",
    "H"
  ],
  BW: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  BY: [
    "H",
    "h"
  ],
  BZ: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  CA: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  CC: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  CD: [
    "hB",
    "H"
  ],
  CF: [
    "H",
    "h",
    "hB"
  ],
  CG: [
    "H",
    "hB"
  ],
  CH: [
    "H",
    "hB",
    "h"
  ],
  CI: [
    "H",
    "hB"
  ],
  CK: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  CL: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  CM: [
    "H",
    "h",
    "hB"
  ],
  CN: [
    "H",
    "hB",
    "hb",
    "h"
  ],
  CO: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  CP: [
    "H"
  ],
  CR: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  CU: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  CV: [
    "H",
    "hB"
  ],
  CW: [
    "H",
    "hB"
  ],
  CX: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  CY: [
    "h",
    "H",
    "hb",
    "hB"
  ],
  CZ: [
    "H"
  ],
  DE: [
    "H",
    "hB"
  ],
  DG: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  DJ: [
    "h",
    "H"
  ],
  DK: [
    "H"
  ],
  DM: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  DO: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  DZ: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  EA: [
    "H",
    "h",
    "hB",
    "hb"
  ],
  EC: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  EE: [
    "H",
    "hB"
  ],
  EG: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  EH: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  ER: [
    "h",
    "H"
  ],
  ES: [
    "H",
    "hB",
    "h",
    "hb"
  ],
  ET: [
    "hB",
    "hb",
    "h",
    "H"
  ],
  FI: [
    "H"
  ],
  FJ: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  FK: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  FM: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  FO: [
    "H",
    "h"
  ],
  FR: [
    "H",
    "hB"
  ],
  GA: [
    "H",
    "hB"
  ],
  GB: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  GD: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  GE: [
    "H",
    "hB",
    "h"
  ],
  GF: [
    "H",
    "hB"
  ],
  GG: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  GH: [
    "h",
    "H"
  ],
  GI: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  GL: [
    "H",
    "h"
  ],
  GM: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  GN: [
    "H",
    "hB"
  ],
  GP: [
    "H",
    "hB"
  ],
  GQ: [
    "H",
    "hB",
    "h",
    "hb"
  ],
  GR: [
    "h",
    "H",
    "hb",
    "hB"
  ],
  GT: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  GU: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  GW: [
    "H",
    "hB"
  ],
  GY: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  HK: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  HN: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  HR: [
    "H",
    "hB"
  ],
  HU: [
    "H",
    "h"
  ],
  IC: [
    "H",
    "h",
    "hB",
    "hb"
  ],
  ID: [
    "H"
  ],
  IE: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  IL: [
    "H",
    "hB"
  ],
  IM: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  IN: [
    "h",
    "H"
  ],
  IO: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  IQ: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  IR: [
    "hB",
    "H"
  ],
  IS: [
    "H"
  ],
  IT: [
    "H",
    "hB"
  ],
  JE: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  JM: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  JO: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  JP: [
    "H",
    "K",
    "h"
  ],
  KE: [
    "hB",
    "hb",
    "H",
    "h"
  ],
  KG: [
    "H",
    "h",
    "hB",
    "hb"
  ],
  KH: [
    "hB",
    "h",
    "H",
    "hb"
  ],
  KI: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  KM: [
    "H",
    "h",
    "hB",
    "hb"
  ],
  KN: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  KP: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  KR: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  KW: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  KY: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  KZ: [
    "H",
    "hB"
  ],
  LA: [
    "H",
    "hb",
    "hB",
    "h"
  ],
  LB: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  LC: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  LI: [
    "H",
    "hB",
    "h"
  ],
  LK: [
    "H",
    "h",
    "hB",
    "hb"
  ],
  LR: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  LS: [
    "h",
    "H"
  ],
  LT: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  LU: [
    "H",
    "h",
    "hB"
  ],
  LV: [
    "H",
    "hB",
    "hb",
    "h"
  ],
  LY: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  MA: [
    "H",
    "h",
    "hB",
    "hb"
  ],
  MC: [
    "H",
    "hB"
  ],
  MD: [
    "H",
    "hB"
  ],
  ME: [
    "H",
    "hB",
    "h"
  ],
  MF: [
    "H",
    "hB"
  ],
  MG: [
    "H",
    "h"
  ],
  MH: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  MK: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  ML: [
    "H"
  ],
  MM: [
    "hB",
    "hb",
    "H",
    "h"
  ],
  MN: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  MO: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  MP: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  MQ: [
    "H",
    "hB"
  ],
  MR: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  MS: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  MT: [
    "H",
    "h"
  ],
  MU: [
    "H",
    "h"
  ],
  MV: [
    "H",
    "h"
  ],
  MW: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  MX: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  MY: [
    "hb",
    "hB",
    "h",
    "H"
  ],
  MZ: [
    "H",
    "hB"
  ],
  NA: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  NC: [
    "H",
    "hB"
  ],
  NE: [
    "H"
  ],
  NF: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  NG: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  NI: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  NL: [
    "H",
    "hB"
  ],
  NO: [
    "H",
    "h"
  ],
  NP: [
    "H",
    "h",
    "hB"
  ],
  NR: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  NU: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  NZ: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  OM: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  PA: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  PE: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  PF: [
    "H",
    "h",
    "hB"
  ],
  PG: [
    "h",
    "H"
  ],
  PH: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  PK: [
    "h",
    "hB",
    "H"
  ],
  PL: [
    "H",
    "h"
  ],
  PM: [
    "H",
    "hB"
  ],
  PN: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  PR: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  PS: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  PT: [
    "H",
    "hB"
  ],
  PW: [
    "h",
    "H"
  ],
  PY: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  QA: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  RE: [
    "H",
    "hB"
  ],
  RO: [
    "H",
    "hB"
  ],
  RS: [
    "H",
    "hB",
    "h"
  ],
  RU: [
    "H"
  ],
  RW: [
    "H",
    "h"
  ],
  SA: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  SB: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  SC: [
    "H",
    "h",
    "hB"
  ],
  SD: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  SE: [
    "H"
  ],
  SG: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  SH: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  SI: [
    "H",
    "hB"
  ],
  SJ: [
    "H"
  ],
  SK: [
    "H"
  ],
  SL: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  SM: [
    "H",
    "h",
    "hB"
  ],
  SN: [
    "H",
    "h",
    "hB"
  ],
  SO: [
    "h",
    "H"
  ],
  SR: [
    "H",
    "hB"
  ],
  SS: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  ST: [
    "H",
    "hB"
  ],
  SV: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  SX: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  SY: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  SZ: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  TA: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  TC: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  TD: [
    "h",
    "H",
    "hB"
  ],
  TF: [
    "H",
    "h",
    "hB"
  ],
  TG: [
    "H",
    "hB"
  ],
  TH: [
    "H",
    "h"
  ],
  TJ: [
    "H",
    "h"
  ],
  TL: [
    "H",
    "hB",
    "hb",
    "h"
  ],
  TM: [
    "H",
    "h"
  ],
  TN: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  TO: [
    "h",
    "H"
  ],
  TR: [
    "H",
    "hB"
  ],
  TT: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  TW: [
    "hB",
    "hb",
    "h",
    "H"
  ],
  TZ: [
    "hB",
    "hb",
    "H",
    "h"
  ],
  UA: [
    "H",
    "hB",
    "h"
  ],
  UG: [
    "hB",
    "hb",
    "H",
    "h"
  ],
  UM: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  US: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  UY: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  UZ: [
    "H",
    "hB",
    "h"
  ],
  VA: [
    "H",
    "h",
    "hB"
  ],
  VC: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  VE: [
    "h",
    "H",
    "hB",
    "hb"
  ],
  VG: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  VI: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  VN: [
    "H",
    "h"
  ],
  VU: [
    "h",
    "H"
  ],
  WF: [
    "H",
    "hB"
  ],
  WS: [
    "h",
    "H"
  ],
  XK: [
    "H",
    "hB",
    "h"
  ],
  YE: [
    "h",
    "hB",
    "hb",
    "H"
  ],
  YT: [
    "H",
    "hB"
  ],
  ZA: [
    "H",
    "h",
    "hb",
    "hB"
  ],
  ZM: [
    "h",
    "hb",
    "H",
    "hB"
  ],
  ZW: [
    "H",
    "h"
  ],
  "af-ZA": [
    "H",
    "h",
    "hB",
    "hb"
  ],
  "ar-001": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "ca-ES": [
    "H",
    "h",
    "hB"
  ],
  "en-001": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "en-HK": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "en-IL": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "en-MY": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "es-BR": [
    "H",
    "h",
    "hB",
    "hb"
  ],
  "es-ES": [
    "H",
    "h",
    "hB",
    "hb"
  ],
  "es-GQ": [
    "H",
    "h",
    "hB",
    "hb"
  ],
  "fr-CA": [
    "H",
    "h",
    "hB"
  ],
  "gl-ES": [
    "H",
    "h",
    "hB"
  ],
  "gu-IN": [
    "hB",
    "hb",
    "h",
    "H"
  ],
  "hi-IN": [
    "hB",
    "h",
    "H"
  ],
  "it-CH": [
    "H",
    "h",
    "hB"
  ],
  "it-IT": [
    "H",
    "h",
    "hB"
  ],
  "kn-IN": [
    "hB",
    "h",
    "H"
  ],
  "ml-IN": [
    "hB",
    "h",
    "H"
  ],
  "mr-IN": [
    "hB",
    "hb",
    "h",
    "H"
  ],
  "pa-IN": [
    "hB",
    "hb",
    "h",
    "H"
  ],
  "ta-IN": [
    "hB",
    "h",
    "hb",
    "H"
  ],
  "te-IN": [
    "hB",
    "h",
    "H"
  ],
  "zu-ZA": [
    "H",
    "hB",
    "hb",
    "h"
  ]
};

// ../node_modules/@formatjs/icu-messageformat-parser/lib/date-time-pattern-generator.js
function getBestPattern(skeleton, locale) {
  for (var skeletonCopy = "", patternPos = 0; patternPos < skeleton.length; patternPos++) {
    var patternChar = skeleton.charAt(patternPos);
    if (patternChar === "j") {
      for (var extraLength = 0; patternPos + 1 < skeleton.length && skeleton.charAt(patternPos + 1) === patternChar; )
        extraLength++, patternPos++;
      var hourLen = 1 + (extraLength & 1), dayPeriodLen = extraLength < 2 ? 1 : 3 + (extraLength >> 1), dayPeriodChar = "a", hourChar = getDefaultHourSymbolFromLocale(locale);
      for ((hourChar == "H" || hourChar == "k") && (dayPeriodLen = 0); dayPeriodLen-- > 0; )
        skeletonCopy += dayPeriodChar;
      for (; hourLen-- > 0; )
        skeletonCopy = hourChar + skeletonCopy;
    } else patternChar === "J" ? skeletonCopy += "H" : skeletonCopy += patternChar;
  }
  return skeletonCopy;
}
function getDefaultHourSymbolFromLocale(locale) {
  var hourCycle = locale.hourCycle;
  if (hourCycle === void 0 && // @ts-ignore hourCycle(s) is not identified yet
  locale.hourCycles && // @ts-ignore
  locale.hourCycles.length && (hourCycle = locale.hourCycles[0]), hourCycle)
    switch (hourCycle) {
      case "h24":
        return "k";
      case "h23":
        return "H";
      case "h12":
        return "h";
      case "h11":
        return "K";
      default:
        throw new Error("Invalid hourCycle");
    }
  var languageTag = locale.language, regionTag;
  languageTag !== "root" && (regionTag = locale.maximize().region);
  var hourCycles = timeData[regionTag || ""] || timeData[languageTag || ""] || timeData["".concat(languageTag, "-001")] || timeData["001"];
  return hourCycles[0];
}

// ../node_modules/@formatjs/icu-messageformat-parser/lib/parser.js
var _a, SPACE_SEPARATOR_START_REGEX = new RegExp("^".concat(SPACE_SEPARATOR_REGEX.source, "*")), SPACE_SEPARATOR_END_REGEX = new RegExp("".concat(SPACE_SEPARATOR_REGEX.source, "*$"));
function createLocation(start, end) {
  return { start, end };
}
var hasNativeStartsWith = !!String.prototype.startsWith && "_a".startsWith("a", 1), hasNativeFromCodePoint = !!String.fromCodePoint, hasNativeFromEntries = !!Object.fromEntries, hasNativeCodePointAt = !!String.prototype.codePointAt, hasTrimStart = !!String.prototype.trimStart, hasTrimEnd = !!String.prototype.trimEnd, hasNativeIsSafeInteger = !!Number.isSafeInteger, isSafeInteger = hasNativeIsSafeInteger ? Number.isSafeInteger : function(n) {
  return typeof n == "number" && isFinite(n) && Math.floor(n) === n && Math.abs(n) <= 9007199254740991;
}, REGEX_SUPPORTS_U_AND_Y = !0;
try {
  re = RE("([^\\p{White_Space}\\p{Pattern_Syntax}]*)", "yu"), REGEX_SUPPORTS_U_AND_Y = ((_a = re.exec("a")) === null || _a === void 0 ? void 0 : _a[0]) === "a";
} catch {
  REGEX_SUPPORTS_U_AND_Y = !1;
}
var re, startsWith = hasNativeStartsWith ? (
  // Native
  function(s, search, position) {
    return s.startsWith(search, position);
  }
) : (
  // For IE11
  function(s, search, position) {
    return s.slice(position, position + search.length) === search;
  }
), fromCodePoint = hasNativeFromCodePoint ? String.fromCodePoint : (
  // IE11
  function() {
    for (var codePoints = [], _i = 0; _i < arguments.length; _i++)
      codePoints[_i] = arguments[_i];
    for (var elements = "", length = codePoints.length, i = 0, code; length > i; ) {
      if (code = codePoints[i++], code > 1114111)
        throw RangeError(code + " is not a valid code point");
      elements += code < 65536 ? String.fromCharCode(code) : String.fromCharCode(((code -= 65536) >> 10) + 55296, code % 1024 + 56320);
    }
    return elements;
  }
), fromEntries = (
  // native
  hasNativeFromEntries ? Object.fromEntries : (
    // Ponyfill
    function(entries) {
      for (var obj = {}, _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
        var _a2 = entries_1[_i], k = _a2[0], v = _a2[1];
        obj[k] = v;
      }
      return obj;
    }
  )
), codePointAt = hasNativeCodePointAt ? (
  // Native
  function(s, index3) {
    return s.codePointAt(index3);
  }
) : (
  // IE 11
  function(s, index3) {
    var size = s.length;
    if (!(index3 < 0 || index3 >= size)) {
      var first = s.charCodeAt(index3), second;
      return first < 55296 || first > 56319 || index3 + 1 === size || (second = s.charCodeAt(index3 + 1)) < 56320 || second > 57343 ? first : (first - 55296 << 10) + (second - 56320) + 65536;
    }
  }
), trimStart = hasTrimStart ? (
  // Native
  function(s) {
    return s.trimStart();
  }
) : (
  // Ponyfill
  function(s) {
    return s.replace(SPACE_SEPARATOR_START_REGEX, "");
  }
), trimEnd = hasTrimEnd ? (
  // Native
  function(s) {
    return s.trimEnd();
  }
) : (
  // Ponyfill
  function(s) {
    return s.replace(SPACE_SEPARATOR_END_REGEX, "");
  }
);
function RE(s, flag) {
  return new RegExp(s, flag);
}
var matchIdentifierAtIndex;
REGEX_SUPPORTS_U_AND_Y ? (IDENTIFIER_PREFIX_RE_1 = RE("([^\\p{White_Space}\\p{Pattern_Syntax}]*)", "yu"), matchIdentifierAtIndex = function(s, index3) {
  var _a2;
  IDENTIFIER_PREFIX_RE_1.lastIndex = index3;
  var match = IDENTIFIER_PREFIX_RE_1.exec(s);
  return (_a2 = match[1]) !== null && _a2 !== void 0 ? _a2 : "";
}) : matchIdentifierAtIndex = function(s, index3) {
  for (var match = []; ; ) {
    var c = codePointAt(s, index3);
    if (c === void 0 || _isWhiteSpace(c) || _isPatternSyntax(c))
      break;
    match.push(c), index3 += c >= 65536 ? 2 : 1;
  }
  return fromCodePoint.apply(void 0, match);
};
var IDENTIFIER_PREFIX_RE_1, Parser = (
  /** @class */
  (function() {
    function Parser2(message, options) {
      options === void 0 && (options = {}), this.message = message, this.position = { offset: 0, line: 1, column: 1 }, this.ignoreTag = !!options.ignoreTag, this.locale = options.locale, this.requiresOtherClause = !!options.requiresOtherClause, this.shouldParseSkeletons = !!options.shouldParseSkeletons;
    }
    return Parser2.prototype.parse = function() {
      if (this.offset() !== 0)
        throw Error("parser can only be used once");
      return this.parseMessage(0, "", !1);
    }, Parser2.prototype.parseMessage = function(nestingLevel, parentArgType, expectingCloseTag) {
      for (var elements = []; !this.isEOF(); ) {
        var char = this.char();
        if (char === 123) {
          var result = this.parseArgument(nestingLevel, expectingCloseTag);
          if (result.err)
            return result;
          elements.push(result.val);
        } else {
          if (char === 125 && nestingLevel > 0)
            break;
          if (char === 35 && (parentArgType === "plural" || parentArgType === "selectordinal")) {
            var position = this.clonePosition();
            this.bump(), elements.push({
              type: TYPE.pound,
              location: createLocation(position, this.clonePosition())
            });
          } else if (char === 60 && !this.ignoreTag && this.peek() === 47) {
            if (expectingCloseTag)
              break;
            return this.error(ErrorKind.UNMATCHED_CLOSING_TAG, createLocation(this.clonePosition(), this.clonePosition()));
          } else if (char === 60 && !this.ignoreTag && _isAlpha(this.peek() || 0)) {
            var result = this.parseTag(nestingLevel, parentArgType);
            if (result.err)
              return result;
            elements.push(result.val);
          } else {
            var result = this.parseLiteral(nestingLevel, parentArgType);
            if (result.err)
              return result;
            elements.push(result.val);
          }
        }
      }
      return { val: elements, err: null };
    }, Parser2.prototype.parseTag = function(nestingLevel, parentArgType) {
      var startPosition = this.clonePosition();
      this.bump();
      var tagName = this.parseTagName();
      if (this.bumpSpace(), this.bumpIf("/>"))
        return {
          val: {
            type: TYPE.literal,
            value: "<".concat(tagName, "/>"),
            location: createLocation(startPosition, this.clonePosition())
          },
          err: null
        };
      if (this.bumpIf(">")) {
        var childrenResult = this.parseMessage(nestingLevel + 1, parentArgType, !0);
        if (childrenResult.err)
          return childrenResult;
        var children = childrenResult.val, endTagStartPosition = this.clonePosition();
        if (this.bumpIf("</")) {
          if (this.isEOF() || !_isAlpha(this.char()))
            return this.error(ErrorKind.INVALID_TAG, createLocation(endTagStartPosition, this.clonePosition()));
          var closingTagNameStartPosition = this.clonePosition(), closingTagName = this.parseTagName();
          return tagName !== closingTagName ? this.error(ErrorKind.UNMATCHED_CLOSING_TAG, createLocation(closingTagNameStartPosition, this.clonePosition())) : (this.bumpSpace(), this.bumpIf(">") ? {
            val: {
              type: TYPE.tag,
              value: tagName,
              children,
              location: createLocation(startPosition, this.clonePosition())
            },
            err: null
          } : this.error(ErrorKind.INVALID_TAG, createLocation(endTagStartPosition, this.clonePosition())));
        } else
          return this.error(ErrorKind.UNCLOSED_TAG, createLocation(startPosition, this.clonePosition()));
      } else
        return this.error(ErrorKind.INVALID_TAG, createLocation(startPosition, this.clonePosition()));
    }, Parser2.prototype.parseTagName = function() {
      var startOffset = this.offset();
      for (this.bump(); !this.isEOF() && _isPotentialElementNameChar(this.char()); )
        this.bump();
      return this.message.slice(startOffset, this.offset());
    }, Parser2.prototype.parseLiteral = function(nestingLevel, parentArgType) {
      for (var start = this.clonePosition(), value = ""; ; ) {
        var parseQuoteResult = this.tryParseQuote(parentArgType);
        if (parseQuoteResult) {
          value += parseQuoteResult;
          continue;
        }
        var parseUnquotedResult = this.tryParseUnquoted(nestingLevel, parentArgType);
        if (parseUnquotedResult) {
          value += parseUnquotedResult;
          continue;
        }
        var parseLeftAngleResult = this.tryParseLeftAngleBracket();
        if (parseLeftAngleResult) {
          value += parseLeftAngleResult;
          continue;
        }
        break;
      }
      var location2 = createLocation(start, this.clonePosition());
      return {
        val: { type: TYPE.literal, value, location: location2 },
        err: null
      };
    }, Parser2.prototype.tryParseLeftAngleBracket = function() {
      return !this.isEOF() && this.char() === 60 && (this.ignoreTag || // If at the opening tag or closing tag position, bail.
      !_isAlphaOrSlash(this.peek() || 0)) ? (this.bump(), "<") : null;
    }, Parser2.prototype.tryParseQuote = function(parentArgType) {
      if (this.isEOF() || this.char() !== 39)
        return null;
      switch (this.peek()) {
        case 39:
          return this.bump(), this.bump(), "'";
        // '{', '<', '>', '}'
        case 123:
        case 60:
        case 62:
        case 125:
          break;
        case 35:
          if (parentArgType === "plural" || parentArgType === "selectordinal")
            break;
          return null;
        default:
          return null;
      }
      this.bump();
      var codePoints = [this.char()];
      for (this.bump(); !this.isEOF(); ) {
        var ch = this.char();
        if (ch === 39)
          if (this.peek() === 39)
            codePoints.push(39), this.bump();
          else {
            this.bump();
            break;
          }
        else
          codePoints.push(ch);
        this.bump();
      }
      return fromCodePoint.apply(void 0, codePoints);
    }, Parser2.prototype.tryParseUnquoted = function(nestingLevel, parentArgType) {
      if (this.isEOF())
        return null;
      var ch = this.char();
      return ch === 60 || ch === 123 || ch === 35 && (parentArgType === "plural" || parentArgType === "selectordinal") || ch === 125 && nestingLevel > 0 ? null : (this.bump(), fromCodePoint(ch));
    }, Parser2.prototype.parseArgument = function(nestingLevel, expectingCloseTag) {
      var openingBracePosition = this.clonePosition();
      if (this.bump(), this.bumpSpace(), this.isEOF())
        return this.error(ErrorKind.EXPECT_ARGUMENT_CLOSING_BRACE, createLocation(openingBracePosition, this.clonePosition()));
      if (this.char() === 125)
        return this.bump(), this.error(ErrorKind.EMPTY_ARGUMENT, createLocation(openingBracePosition, this.clonePosition()));
      var value = this.parseIdentifierIfPossible().value;
      if (!value)
        return this.error(ErrorKind.MALFORMED_ARGUMENT, createLocation(openingBracePosition, this.clonePosition()));
      if (this.bumpSpace(), this.isEOF())
        return this.error(ErrorKind.EXPECT_ARGUMENT_CLOSING_BRACE, createLocation(openingBracePosition, this.clonePosition()));
      switch (this.char()) {
        // Simple argument: `{name}`
        case 125:
          return this.bump(), {
            val: {
              type: TYPE.argument,
              // value does not include the opening and closing braces.
              value,
              location: createLocation(openingBracePosition, this.clonePosition())
            },
            err: null
          };
        // Argument with options: `{name, format, ...}`
        case 44:
          return this.bump(), this.bumpSpace(), this.isEOF() ? this.error(ErrorKind.EXPECT_ARGUMENT_CLOSING_BRACE, createLocation(openingBracePosition, this.clonePosition())) : this.parseArgumentOptions(nestingLevel, expectingCloseTag, value, openingBracePosition);
        default:
          return this.error(ErrorKind.MALFORMED_ARGUMENT, createLocation(openingBracePosition, this.clonePosition()));
      }
    }, Parser2.prototype.parseIdentifierIfPossible = function() {
      var startingPosition = this.clonePosition(), startOffset = this.offset(), value = matchIdentifierAtIndex(this.message, startOffset), endOffset = startOffset + value.length;
      this.bumpTo(endOffset);
      var endPosition = this.clonePosition(), location2 = createLocation(startingPosition, endPosition);
      return { value, location: location2 };
    }, Parser2.prototype.parseArgumentOptions = function(nestingLevel, expectingCloseTag, value, openingBracePosition) {
      var _a2, typeStartPosition = this.clonePosition(), argType = this.parseIdentifierIfPossible().value, typeEndPosition = this.clonePosition();
      switch (argType) {
        case "":
          return this.error(ErrorKind.EXPECT_ARGUMENT_TYPE, createLocation(typeStartPosition, typeEndPosition));
        case "number":
        case "date":
        case "time": {
          this.bumpSpace();
          var styleAndLocation = null;
          if (this.bumpIf(",")) {
            this.bumpSpace();
            var styleStartPosition = this.clonePosition(), result = this.parseSimpleArgStyleIfPossible();
            if (result.err)
              return result;
            var style = trimEnd(result.val);
            if (style.length === 0)
              return this.error(ErrorKind.EXPECT_ARGUMENT_STYLE, createLocation(this.clonePosition(), this.clonePosition()));
            var styleLocation = createLocation(styleStartPosition, this.clonePosition());
            styleAndLocation = { style, styleLocation };
          }
          var argCloseResult = this.tryParseArgumentClose(openingBracePosition);
          if (argCloseResult.err)
            return argCloseResult;
          var location_1 = createLocation(openingBracePosition, this.clonePosition());
          if (styleAndLocation && startsWith(styleAndLocation?.style, "::", 0)) {
            var skeleton = trimStart(styleAndLocation.style.slice(2));
            if (argType === "number") {
              var result = this.parseNumberSkeletonFromString(skeleton, styleAndLocation.styleLocation);
              return result.err ? result : {
                val: { type: TYPE.number, value, location: location_1, style: result.val },
                err: null
              };
            } else {
              if (skeleton.length === 0)
                return this.error(ErrorKind.EXPECT_DATE_TIME_SKELETON, location_1);
              var dateTimePattern = skeleton;
              this.locale && (dateTimePattern = getBestPattern(skeleton, this.locale));
              var style = {
                type: SKELETON_TYPE.dateTime,
                pattern: dateTimePattern,
                location: styleAndLocation.styleLocation,
                parsedOptions: this.shouldParseSkeletons ? parseDateTimeSkeleton(dateTimePattern) : {}
              }, type = argType === "date" ? TYPE.date : TYPE.time;
              return {
                val: { type, value, location: location_1, style },
                err: null
              };
            }
          }
          return {
            val: {
              type: argType === "number" ? TYPE.number : argType === "date" ? TYPE.date : TYPE.time,
              value,
              location: location_1,
              style: (_a2 = styleAndLocation?.style) !== null && _a2 !== void 0 ? _a2 : null
            },
            err: null
          };
        }
        case "plural":
        case "selectordinal":
        case "select": {
          var typeEndPosition_1 = this.clonePosition();
          if (this.bumpSpace(), !this.bumpIf(","))
            return this.error(ErrorKind.EXPECT_SELECT_ARGUMENT_OPTIONS, createLocation(typeEndPosition_1, __assign({}, typeEndPosition_1)));
          this.bumpSpace();
          var identifierAndLocation = this.parseIdentifierIfPossible(), pluralOffset = 0;
          if (argType !== "select" && identifierAndLocation.value === "offset") {
            if (!this.bumpIf(":"))
              return this.error(ErrorKind.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE, createLocation(this.clonePosition(), this.clonePosition()));
            this.bumpSpace();
            var result = this.tryParseDecimalInteger(ErrorKind.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE, ErrorKind.INVALID_PLURAL_ARGUMENT_OFFSET_VALUE);
            if (result.err)
              return result;
            this.bumpSpace(), identifierAndLocation = this.parseIdentifierIfPossible(), pluralOffset = result.val;
          }
          var optionsResult = this.tryParsePluralOrSelectOptions(nestingLevel, argType, expectingCloseTag, identifierAndLocation);
          if (optionsResult.err)
            return optionsResult;
          var argCloseResult = this.tryParseArgumentClose(openingBracePosition);
          if (argCloseResult.err)
            return argCloseResult;
          var location_2 = createLocation(openingBracePosition, this.clonePosition());
          return argType === "select" ? {
            val: {
              type: TYPE.select,
              value,
              options: fromEntries(optionsResult.val),
              location: location_2
            },
            err: null
          } : {
            val: {
              type: TYPE.plural,
              value,
              options: fromEntries(optionsResult.val),
              offset: pluralOffset,
              pluralType: argType === "plural" ? "cardinal" : "ordinal",
              location: location_2
            },
            err: null
          };
        }
        default:
          return this.error(ErrorKind.INVALID_ARGUMENT_TYPE, createLocation(typeStartPosition, typeEndPosition));
      }
    }, Parser2.prototype.tryParseArgumentClose = function(openingBracePosition) {
      return this.isEOF() || this.char() !== 125 ? this.error(ErrorKind.EXPECT_ARGUMENT_CLOSING_BRACE, createLocation(openingBracePosition, this.clonePosition())) : (this.bump(), { val: !0, err: null });
    }, Parser2.prototype.parseSimpleArgStyleIfPossible = function() {
      for (var nestedBraces = 0, startPosition = this.clonePosition(); !this.isEOF(); ) {
        var ch = this.char();
        switch (ch) {
          case 39: {
            this.bump();
            var apostrophePosition = this.clonePosition();
            if (!this.bumpUntil("'"))
              return this.error(ErrorKind.UNCLOSED_QUOTE_IN_ARGUMENT_STYLE, createLocation(apostrophePosition, this.clonePosition()));
            this.bump();
            break;
          }
          case 123: {
            nestedBraces += 1, this.bump();
            break;
          }
          case 125: {
            if (nestedBraces > 0)
              nestedBraces -= 1;
            else
              return {
                val: this.message.slice(startPosition.offset, this.offset()),
                err: null
              };
            break;
          }
          default:
            this.bump();
            break;
        }
      }
      return {
        val: this.message.slice(startPosition.offset, this.offset()),
        err: null
      };
    }, Parser2.prototype.parseNumberSkeletonFromString = function(skeleton, location2) {
      var tokens = [];
      try {
        tokens = parseNumberSkeletonFromString(skeleton);
      } catch {
        return this.error(ErrorKind.INVALID_NUMBER_SKELETON, location2);
      }
      return {
        val: {
          type: SKELETON_TYPE.number,
          tokens,
          location: location2,
          parsedOptions: this.shouldParseSkeletons ? parseNumberSkeleton(tokens) : {}
        },
        err: null
      };
    }, Parser2.prototype.tryParsePluralOrSelectOptions = function(nestingLevel, parentArgType, expectCloseTag, parsedFirstIdentifier) {
      for (var _a2, hasOtherClause = !1, options = [], parsedSelectors = /* @__PURE__ */ new Set(), selector = parsedFirstIdentifier.value, selectorLocation = parsedFirstIdentifier.location; ; ) {
        if (selector.length === 0) {
          var startPosition = this.clonePosition();
          if (parentArgType !== "select" && this.bumpIf("=")) {
            var result = this.tryParseDecimalInteger(ErrorKind.EXPECT_PLURAL_ARGUMENT_SELECTOR, ErrorKind.INVALID_PLURAL_ARGUMENT_SELECTOR);
            if (result.err)
              return result;
            selectorLocation = createLocation(startPosition, this.clonePosition()), selector = this.message.slice(startPosition.offset, this.offset());
          } else
            break;
        }
        if (parsedSelectors.has(selector))
          return this.error(parentArgType === "select" ? ErrorKind.DUPLICATE_SELECT_ARGUMENT_SELECTOR : ErrorKind.DUPLICATE_PLURAL_ARGUMENT_SELECTOR, selectorLocation);
        selector === "other" && (hasOtherClause = !0), this.bumpSpace();
        var openingBracePosition = this.clonePosition();
        if (!this.bumpIf("{"))
          return this.error(parentArgType === "select" ? ErrorKind.EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT : ErrorKind.EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT, createLocation(this.clonePosition(), this.clonePosition()));
        var fragmentResult = this.parseMessage(nestingLevel + 1, parentArgType, expectCloseTag);
        if (fragmentResult.err)
          return fragmentResult;
        var argCloseResult = this.tryParseArgumentClose(openingBracePosition);
        if (argCloseResult.err)
          return argCloseResult;
        options.push([
          selector,
          {
            value: fragmentResult.val,
            location: createLocation(openingBracePosition, this.clonePosition())
          }
        ]), parsedSelectors.add(selector), this.bumpSpace(), _a2 = this.parseIdentifierIfPossible(), selector = _a2.value, selectorLocation = _a2.location;
      }
      return options.length === 0 ? this.error(parentArgType === "select" ? ErrorKind.EXPECT_SELECT_ARGUMENT_SELECTOR : ErrorKind.EXPECT_PLURAL_ARGUMENT_SELECTOR, createLocation(this.clonePosition(), this.clonePosition())) : this.requiresOtherClause && !hasOtherClause ? this.error(ErrorKind.MISSING_OTHER_CLAUSE, createLocation(this.clonePosition(), this.clonePosition())) : { val: options, err: null };
    }, Parser2.prototype.tryParseDecimalInteger = function(expectNumberError, invalidNumberError) {
      var sign = 1, startingPosition = this.clonePosition();
      this.bumpIf("+") || this.bumpIf("-") && (sign = -1);
      for (var hasDigits = !1, decimal = 0; !this.isEOF(); ) {
        var ch = this.char();
        if (ch >= 48 && ch <= 57)
          hasDigits = !0, decimal = decimal * 10 + (ch - 48), this.bump();
        else
          break;
      }
      var location2 = createLocation(startingPosition, this.clonePosition());
      return hasDigits ? (decimal *= sign, isSafeInteger(decimal) ? { val: decimal, err: null } : this.error(invalidNumberError, location2)) : this.error(expectNumberError, location2);
    }, Parser2.prototype.offset = function() {
      return this.position.offset;
    }, Parser2.prototype.isEOF = function() {
      return this.offset() === this.message.length;
    }, Parser2.prototype.clonePosition = function() {
      return {
        offset: this.position.offset,
        line: this.position.line,
        column: this.position.column
      };
    }, Parser2.prototype.char = function() {
      var offset = this.position.offset;
      if (offset >= this.message.length)
        throw Error("out of bound");
      var code = codePointAt(this.message, offset);
      if (code === void 0)
        throw Error("Offset ".concat(offset, " is at invalid UTF-16 code unit boundary"));
      return code;
    }, Parser2.prototype.error = function(kind, location2) {
      return {
        val: null,
        err: {
          kind,
          message: this.message,
          location: location2
        }
      };
    }, Parser2.prototype.bump = function() {
      if (!this.isEOF()) {
        var code = this.char();
        code === 10 ? (this.position.line += 1, this.position.column = 1, this.position.offset += 1) : (this.position.column += 1, this.position.offset += code < 65536 ? 1 : 2);
      }
    }, Parser2.prototype.bumpIf = function(prefix) {
      if (startsWith(this.message, prefix, this.offset())) {
        for (var i = 0; i < prefix.length; i++)
          this.bump();
        return !0;
      }
      return !1;
    }, Parser2.prototype.bumpUntil = function(pattern) {
      var currentOffset = this.offset(), index3 = this.message.indexOf(pattern, currentOffset);
      return index3 >= 0 ? (this.bumpTo(index3), !0) : (this.bumpTo(this.message.length), !1);
    }, Parser2.prototype.bumpTo = function(targetOffset) {
      if (this.offset() > targetOffset)
        throw Error("targetOffset ".concat(targetOffset, " must be greater than or equal to the current offset ").concat(this.offset()));
      for (targetOffset = Math.min(targetOffset, this.message.length); ; ) {
        var offset = this.offset();
        if (offset === targetOffset)
          break;
        if (offset > targetOffset)
          throw Error("targetOffset ".concat(targetOffset, " is at invalid UTF-16 code unit boundary"));
        if (this.bump(), this.isEOF())
          break;
      }
    }, Parser2.prototype.bumpSpace = function() {
      for (; !this.isEOF() && _isWhiteSpace(this.char()); )
        this.bump();
    }, Parser2.prototype.peek = function() {
      if (this.isEOF())
        return null;
      var code = this.char(), offset = this.offset(), nextCode = this.message.charCodeAt(offset + (code >= 65536 ? 2 : 1));
      return nextCode ?? null;
    }, Parser2;
  })()
);
function _isAlpha(codepoint) {
  return codepoint >= 97 && codepoint <= 122 || codepoint >= 65 && codepoint <= 90;
}
function _isAlphaOrSlash(codepoint) {
  return _isAlpha(codepoint) || codepoint === 47;
}
function _isPotentialElementNameChar(c) {
  return c === 45 || c === 46 || c >= 48 && c <= 57 || c === 95 || c >= 97 && c <= 122 || c >= 65 && c <= 90 || c == 183 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 893 || c >= 895 && c <= 8191 || c >= 8204 && c <= 8205 || c >= 8255 && c <= 8256 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
}
function _isWhiteSpace(c) {
  return c >= 9 && c <= 13 || c === 32 || c === 133 || c >= 8206 && c <= 8207 || c === 8232 || c === 8233;
}
function _isPatternSyntax(c) {
  return c >= 33 && c <= 35 || c === 36 || c >= 37 && c <= 39 || c === 40 || c === 41 || c === 42 || c === 43 || c === 44 || c === 45 || c >= 46 && c <= 47 || c >= 58 && c <= 59 || c >= 60 && c <= 62 || c >= 63 && c <= 64 || c === 91 || c === 92 || c === 93 || c === 94 || c === 96 || c === 123 || c === 124 || c === 125 || c === 126 || c === 161 || c >= 162 && c <= 165 || c === 166 || c === 167 || c === 169 || c === 171 || c === 172 || c === 174 || c === 176 || c === 177 || c === 182 || c === 187 || c === 191 || c === 215 || c === 247 || c >= 8208 && c <= 8213 || c >= 8214 && c <= 8215 || c === 8216 || c === 8217 || c === 8218 || c >= 8219 && c <= 8220 || c === 8221 || c === 8222 || c === 8223 || c >= 8224 && c <= 8231 || c >= 8240 && c <= 8248 || c === 8249 || c === 8250 || c >= 8251 && c <= 8254 || c >= 8257 && c <= 8259 || c === 8260 || c === 8261 || c === 8262 || c >= 8263 && c <= 8273 || c === 8274 || c === 8275 || c >= 8277 && c <= 8286 || c >= 8592 && c <= 8596 || c >= 8597 && c <= 8601 || c >= 8602 && c <= 8603 || c >= 8604 && c <= 8607 || c === 8608 || c >= 8609 && c <= 8610 || c === 8611 || c >= 8612 && c <= 8613 || c === 8614 || c >= 8615 && c <= 8621 || c === 8622 || c >= 8623 && c <= 8653 || c >= 8654 && c <= 8655 || c >= 8656 && c <= 8657 || c === 8658 || c === 8659 || c === 8660 || c >= 8661 && c <= 8691 || c >= 8692 && c <= 8959 || c >= 8960 && c <= 8967 || c === 8968 || c === 8969 || c === 8970 || c === 8971 || c >= 8972 && c <= 8991 || c >= 8992 && c <= 8993 || c >= 8994 && c <= 9e3 || c === 9001 || c === 9002 || c >= 9003 && c <= 9083 || c === 9084 || c >= 9085 && c <= 9114 || c >= 9115 && c <= 9139 || c >= 9140 && c <= 9179 || c >= 9180 && c <= 9185 || c >= 9186 && c <= 9254 || c >= 9255 && c <= 9279 || c >= 9280 && c <= 9290 || c >= 9291 && c <= 9311 || c >= 9472 && c <= 9654 || c === 9655 || c >= 9656 && c <= 9664 || c === 9665 || c >= 9666 && c <= 9719 || c >= 9720 && c <= 9727 || c >= 9728 && c <= 9838 || c === 9839 || c >= 9840 && c <= 10087 || c === 10088 || c === 10089 || c === 10090 || c === 10091 || c === 10092 || c === 10093 || c === 10094 || c === 10095 || c === 10096 || c === 10097 || c === 10098 || c === 10099 || c === 10100 || c === 10101 || c >= 10132 && c <= 10175 || c >= 10176 && c <= 10180 || c === 10181 || c === 10182 || c >= 10183 && c <= 10213 || c === 10214 || c === 10215 || c === 10216 || c === 10217 || c === 10218 || c === 10219 || c === 10220 || c === 10221 || c === 10222 || c === 10223 || c >= 10224 && c <= 10239 || c >= 10240 && c <= 10495 || c >= 10496 && c <= 10626 || c === 10627 || c === 10628 || c === 10629 || c === 10630 || c === 10631 || c === 10632 || c === 10633 || c === 10634 || c === 10635 || c === 10636 || c === 10637 || c === 10638 || c === 10639 || c === 10640 || c === 10641 || c === 10642 || c === 10643 || c === 10644 || c === 10645 || c === 10646 || c === 10647 || c === 10648 || c >= 10649 && c <= 10711 || c === 10712 || c === 10713 || c === 10714 || c === 10715 || c >= 10716 && c <= 10747 || c === 10748 || c === 10749 || c >= 10750 && c <= 11007 || c >= 11008 && c <= 11055 || c >= 11056 && c <= 11076 || c >= 11077 && c <= 11078 || c >= 11079 && c <= 11084 || c >= 11085 && c <= 11123 || c >= 11124 && c <= 11125 || c >= 11126 && c <= 11157 || c === 11158 || c >= 11159 && c <= 11263 || c >= 11776 && c <= 11777 || c === 11778 || c === 11779 || c === 11780 || c === 11781 || c >= 11782 && c <= 11784 || c === 11785 || c === 11786 || c === 11787 || c === 11788 || c === 11789 || c >= 11790 && c <= 11798 || c === 11799 || c >= 11800 && c <= 11801 || c === 11802 || c === 11803 || c === 11804 || c === 11805 || c >= 11806 && c <= 11807 || c === 11808 || c === 11809 || c === 11810 || c === 11811 || c === 11812 || c === 11813 || c === 11814 || c === 11815 || c === 11816 || c === 11817 || c >= 11818 && c <= 11822 || c === 11823 || c >= 11824 && c <= 11833 || c >= 11834 && c <= 11835 || c >= 11836 && c <= 11839 || c === 11840 || c === 11841 || c === 11842 || c >= 11843 && c <= 11855 || c >= 11856 && c <= 11857 || c === 11858 || c >= 11859 && c <= 11903 || c >= 12289 && c <= 12291 || c === 12296 || c === 12297 || c === 12298 || c === 12299 || c === 12300 || c === 12301 || c === 12302 || c === 12303 || c === 12304 || c === 12305 || c >= 12306 && c <= 12307 || c === 12308 || c === 12309 || c === 12310 || c === 12311 || c === 12312 || c === 12313 || c === 12314 || c === 12315 || c === 12316 || c === 12317 || c >= 12318 && c <= 12319 || c === 12320 || c === 12336 || c === 64830 || c === 64831 || c >= 65093 && c <= 65094;
}

// ../node_modules/@formatjs/icu-messageformat-parser/lib/index.js
function pruneLocation(els) {
  els.forEach(function(el) {
    if (delete el.location, isSelectElement(el) || isPluralElement(el))
      for (var k in el.options)
        delete el.options[k].location, pruneLocation(el.options[k].value);
    else isNumberElement(el) && isNumberSkeleton(el.style) || (isDateElement(el) || isTimeElement(el)) && isDateTimeSkeleton(el.style) ? delete el.style.location : isTagElement(el) && pruneLocation(el.children);
  });
}
function parse(message, opts) {
  opts === void 0 && (opts = {}), opts = __assign({ shouldParseSkeletons: !0, requiresOtherClause: !0 }, opts);
  var result = new Parser(message, opts).parse();
  if (result.err) {
    var error = SyntaxError(ErrorKind[result.err.kind]);
    throw error.location = result.err.location, error.originalMessage = result.err.message, error;
  }
  return opts?.captureLocation || pruneLocation(result.val), result.val;
}

// ../node_modules/intl-messageformat/lib/src/error.js
var ErrorCode;
(function(ErrorCode2) {
  ErrorCode2.MISSING_VALUE = "MISSING_VALUE", ErrorCode2.INVALID_VALUE = "INVALID_VALUE", ErrorCode2.MISSING_INTL_API = "MISSING_INTL_API";
})(ErrorCode || (ErrorCode = {}));
var FormatError = (
  /** @class */
  (function(_super) {
    __extends(FormatError2, _super);
    function FormatError2(msg, code, originalMessage) {
      var _this = _super.call(this, msg) || this;
      return _this.code = code, _this.originalMessage = originalMessage, _this;
    }
    return FormatError2.prototype.toString = function() {
      return "[formatjs Error: ".concat(this.code, "] ").concat(this.message);
    }, FormatError2;
  })(Error)
);
var InvalidValueError = (
  /** @class */
  (function(_super) {
    __extends(InvalidValueError2, _super);
    function InvalidValueError2(variableId, value, options, originalMessage) {
      return _super.call(this, 'Invalid values for "'.concat(variableId, '": "').concat(value, '". Options are "').concat(Object.keys(options).join('", "'), '"'), ErrorCode.INVALID_VALUE, originalMessage) || this;
    }
    return InvalidValueError2;
  })(FormatError)
);
var InvalidValueTypeError = (
  /** @class */
  (function(_super) {
    __extends(InvalidValueTypeError2, _super);
    function InvalidValueTypeError2(value, type, originalMessage) {
      return _super.call(this, 'Value for "'.concat(value, '" must be of type ').concat(type), ErrorCode.INVALID_VALUE, originalMessage) || this;
    }
    return InvalidValueTypeError2;
  })(FormatError)
);
var MissingValueError = (
  /** @class */
  (function(_super) {
    __extends(MissingValueError2, _super);
    function MissingValueError2(variableId, originalMessage) {
      return _super.call(this, 'The intl string context variable "'.concat(variableId, '" was not provided to the string "').concat(originalMessage, '"'), ErrorCode.MISSING_VALUE, originalMessage) || this;
    }
    return MissingValueError2;
  })(FormatError)
);

// ../node_modules/intl-messageformat/lib/src/formatters.js
var PART_TYPE;
(function(PART_TYPE2) {
  PART_TYPE2[PART_TYPE2.literal = 0] = "literal", PART_TYPE2[PART_TYPE2.object = 1] = "object";
})(PART_TYPE || (PART_TYPE = {}));
function mergeLiteral(parts) {
  return parts.length < 2 ? parts : parts.reduce(function(all, part) {
    var lastPart = all[all.length - 1];
    return !lastPart || lastPart.type !== PART_TYPE.literal || part.type !== PART_TYPE.literal ? all.push(part) : lastPart.value += part.value, all;
  }, []);
}
function isFormatXMLElementFn(el) {
  return typeof el == "function";
}
function formatToParts(els, locales, formatters, formats, values, currentPluralValue, originalMessage) {
  if (els.length === 1 && isLiteralElement(els[0]))
    return [
      {
        type: PART_TYPE.literal,
        value: els[0].value
      }
    ];
  for (var result = [], _i = 0, els_1 = els; _i < els_1.length; _i++) {
    var el = els_1[_i];
    if (isLiteralElement(el)) {
      result.push({
        type: PART_TYPE.literal,
        value: el.value
      });
      continue;
    }
    if (isPoundElement(el)) {
      typeof currentPluralValue == "number" && result.push({
        type: PART_TYPE.literal,
        value: formatters.getNumberFormat(locales).format(currentPluralValue)
      });
      continue;
    }
    var varName = el.value;
    if (!(values && varName in values))
      throw new MissingValueError(varName, originalMessage);
    var value = values[varName];
    if (isArgumentElement(el)) {
      (!value || typeof value == "string" || typeof value == "number") && (value = typeof value == "string" || typeof value == "number" ? String(value) : ""), result.push({
        type: typeof value == "string" ? PART_TYPE.literal : PART_TYPE.object,
        value
      });
      continue;
    }
    if (isDateElement(el)) {
      var style = typeof el.style == "string" ? formats.date[el.style] : isDateTimeSkeleton(el.style) ? el.style.parsedOptions : void 0;
      result.push({
        type: PART_TYPE.literal,
        value: formatters.getDateTimeFormat(locales, style).format(value)
      });
      continue;
    }
    if (isTimeElement(el)) {
      var style = typeof el.style == "string" ? formats.time[el.style] : isDateTimeSkeleton(el.style) ? el.style.parsedOptions : formats.time.medium;
      result.push({
        type: PART_TYPE.literal,
        value: formatters.getDateTimeFormat(locales, style).format(value)
      });
      continue;
    }
    if (isNumberElement(el)) {
      var style = typeof el.style == "string" ? formats.number[el.style] : isNumberSkeleton(el.style) ? el.style.parsedOptions : void 0;
      style && style.scale && (value = value * (style.scale || 1)), result.push({
        type: PART_TYPE.literal,
        value: formatters.getNumberFormat(locales, style).format(value)
      });
      continue;
    }
    if (isTagElement(el)) {
      var children = el.children, value_1 = el.value, formatFn = values[value_1];
      if (!isFormatXMLElementFn(formatFn))
        throw new InvalidValueTypeError(value_1, "function", originalMessage);
      var parts = formatToParts(children, locales, formatters, formats, values, currentPluralValue), chunks = formatFn(parts.map(function(p) {
        return p.value;
      }));
      Array.isArray(chunks) || (chunks = [chunks]), result.push.apply(result, chunks.map(function(c) {
        return {
          type: typeof c == "string" ? PART_TYPE.literal : PART_TYPE.object,
          value: c
        };
      }));
    }
    if (isSelectElement(el)) {
      var opt = el.options[value] || el.options.other;
      if (!opt)
        throw new InvalidValueError(el.value, value, Object.keys(el.options), originalMessage);
      result.push.apply(result, formatToParts(opt.value, locales, formatters, formats, values));
      continue;
    }
    if (isPluralElement(el)) {
      var opt = el.options["=".concat(value)];
      if (!opt) {
        if (!Intl.PluralRules)
          throw new FormatError(`Intl.PluralRules is not available in this environment.
Try polyfilling it using "@formatjs/intl-pluralrules"
`, ErrorCode.MISSING_INTL_API, originalMessage);
        var rule = formatters.getPluralRules(locales, { type: el.pluralType }).select(value - (el.offset || 0));
        opt = el.options[rule] || el.options.other;
      }
      if (!opt)
        throw new InvalidValueError(el.value, value, Object.keys(el.options), originalMessage);
      result.push.apply(result, formatToParts(opt.value, locales, formatters, formats, values, value - (el.offset || 0)));
      continue;
    }
  }
  return mergeLiteral(result);
}

// ../node_modules/intl-messageformat/lib/src/core.js
function mergeConfig(c1, c2) {
  return c2 ? __assign(__assign(__assign({}, c1 || {}), c2 || {}), Object.keys(c1).reduce(function(all, k) {
    return all[k] = __assign(__assign({}, c1[k]), c2[k] || {}), all;
  }, {})) : c1;
}
function mergeConfigs(defaultConfig, configs) {
  return configs ? Object.keys(defaultConfig).reduce(function(all, k) {
    return all[k] = mergeConfig(defaultConfig[k], configs[k]), all;
  }, __assign({}, defaultConfig)) : defaultConfig;
}
function createFastMemoizeCache(store) {
  return {
    create: function() {
      return {
        get: function(key) {
          return store[key];
        },
        set: function(key, value) {
          store[key] = value;
        }
      };
    }
  };
}
function createDefaultFormatters(cache) {
  return cache === void 0 && (cache = {
    number: {},
    dateTime: {},
    pluralRules: {}
  }), {
    getNumberFormat: memoize(function() {
      for (var _a2, args = [], _i = 0; _i < arguments.length; _i++)
        args[_i] = arguments[_i];
      return new ((_a2 = Intl.NumberFormat).bind.apply(_a2, __spreadArray([void 0], args, !1)))();
    }, {
      cache: createFastMemoizeCache(cache.number),
      strategy: strategies.variadic
    }),
    getDateTimeFormat: memoize(function() {
      for (var _a2, args = [], _i = 0; _i < arguments.length; _i++)
        args[_i] = arguments[_i];
      return new ((_a2 = Intl.DateTimeFormat).bind.apply(_a2, __spreadArray([void 0], args, !1)))();
    }, {
      cache: createFastMemoizeCache(cache.dateTime),
      strategy: strategies.variadic
    }),
    getPluralRules: memoize(function() {
      for (var _a2, args = [], _i = 0; _i < arguments.length; _i++)
        args[_i] = arguments[_i];
      return new ((_a2 = Intl.PluralRules).bind.apply(_a2, __spreadArray([void 0], args, !1)))();
    }, {
      cache: createFastMemoizeCache(cache.pluralRules),
      strategy: strategies.variadic
    })
  };
}
var IntlMessageFormat = (
  /** @class */
  (function() {
    function IntlMessageFormat2(message, locales, overrideFormats, opts) {
      locales === void 0 && (locales = IntlMessageFormat2.defaultLocale);
      var _this = this;
      if (this.formatterCache = {
        number: {},
        dateTime: {},
        pluralRules: {}
      }, this.format = function(values) {
        var parts = _this.formatToParts(values);
        if (parts.length === 1)
          return parts[0].value;
        var result = parts.reduce(function(all, part) {
          return !all.length || part.type !== PART_TYPE.literal || typeof all[all.length - 1] != "string" ? all.push(part.value) : all[all.length - 1] += part.value, all;
        }, []);
        return result.length <= 1 ? result[0] || "" : result;
      }, this.formatToParts = function(values) {
        return formatToParts(_this.ast, _this.locales, _this.formatters, _this.formats, values, void 0, _this.message);
      }, this.resolvedOptions = function() {
        var _a3;
        return {
          locale: ((_a3 = _this.resolvedLocale) === null || _a3 === void 0 ? void 0 : _a3.toString()) || Intl.NumberFormat.supportedLocalesOf(_this.locales)[0]
        };
      }, this.getAst = function() {
        return _this.ast;
      }, this.locales = locales, this.resolvedLocale = IntlMessageFormat2.resolveLocale(locales), typeof message == "string") {
        if (this.message = message, !IntlMessageFormat2.__parse)
          throw new TypeError("IntlMessageFormat.__parse must be set to process `message` of type `string`");
        var _a2 = opts || {}, formatters = _a2.formatters, parseOpts = __rest(_a2, ["formatters"]);
        this.ast = IntlMessageFormat2.__parse(message, __assign(__assign({}, parseOpts), { locale: this.resolvedLocale }));
      } else
        this.ast = message;
      if (!Array.isArray(this.ast))
        throw new TypeError("A message must be provided as a String or AST.");
      this.formats = mergeConfigs(IntlMessageFormat2.formats, overrideFormats), this.formatters = opts && opts.formatters || createDefaultFormatters(this.formatterCache);
    }
    return Object.defineProperty(IntlMessageFormat2, "defaultLocale", {
      get: function() {
        return IntlMessageFormat2.memoizedDefaultLocale || (IntlMessageFormat2.memoizedDefaultLocale = new Intl.NumberFormat().resolvedOptions().locale), IntlMessageFormat2.memoizedDefaultLocale;
      },
      enumerable: !1,
      configurable: !0
    }), IntlMessageFormat2.memoizedDefaultLocale = null, IntlMessageFormat2.resolveLocale = function(locales) {
      if (!(typeof Intl.Locale > "u")) {
        var supportedLocales = Intl.NumberFormat.supportedLocalesOf(locales);
        return supportedLocales.length > 0 ? new Intl.Locale(supportedLocales[0]) : new Intl.Locale(typeof locales == "string" ? locales : locales[0]);
      }
    }, IntlMessageFormat2.__parse = parse, IntlMessageFormat2.formats = {
      number: {
        integer: {
          maximumFractionDigits: 0
        },
        currency: {
          style: "currency"
        },
        percent: {
          style: "percent"
        }
      },
      date: {
        short: {
          month: "numeric",
          day: "numeric",
          year: "2-digit"
        },
        medium: {
          month: "short",
          day: "numeric",
          year: "numeric"
        },
        long: {
          month: "long",
          day: "numeric",
          year: "numeric"
        },
        full: {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric"
        }
      },
      time: {
        short: {
          hour: "numeric",
          minute: "numeric"
        },
        medium: {
          hour: "numeric",
          minute: "numeric",
          second: "numeric"
        },
        long: {
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
          timeZoneName: "short"
        },
        full: {
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
          timeZoneName: "short"
        }
      }
    }, IntlMessageFormat2;
  })()
);

// ../node_modules/@react-aria/i18n/dist/useMessageFormatter.mjs
import { useMemo as $eZWU1$useMemo, useCallback as $eZWU1$useCallback } from "react";

// ../node_modules/@internationalized/string/dist/LocalizedStringDictionary.mjs
var $5b160d28a433310d$var$localeSymbol = Symbol.for("react-aria.i18n.locale"), $5b160d28a433310d$var$stringsSymbol = Symbol.for("react-aria.i18n.strings"), $5b160d28a433310d$var$cachedGlobalStrings, $5b160d28a433310d$export$c17fa47878dc55b6 = class _$5b160d28a433310d$export$c17fa47878dc55b6 {
  /** Returns a localized string for the given key and locale. */
  getStringForLocale(key, locale) {
    let string = this.getStringsForLocale(locale)[key];
    if (!string) throw new Error(`Could not find intl message ${key} in ${locale} locale`);
    return string;
  }
  /** Returns all localized strings for the given locale. */
  getStringsForLocale(locale) {
    let strings = this.strings[locale];
    return strings || (strings = $5b160d28a433310d$var$getStringsForLocale(locale, this.strings, this.defaultLocale), this.strings[locale] = strings), strings;
  }
  static getGlobalDictionaryForPackage(packageName) {
    if (typeof window > "u") return null;
    let locale = window[$5b160d28a433310d$var$localeSymbol];
    if ($5b160d28a433310d$var$cachedGlobalStrings === void 0) {
      let globalStrings = window[$5b160d28a433310d$var$stringsSymbol];
      if (!globalStrings) return null;
      $5b160d28a433310d$var$cachedGlobalStrings = {};
      for (let pkg in globalStrings) $5b160d28a433310d$var$cachedGlobalStrings[pkg] = new _$5b160d28a433310d$export$c17fa47878dc55b6({
        [locale]: globalStrings[pkg]
      }, locale);
    }
    let dictionary = $5b160d28a433310d$var$cachedGlobalStrings?.[packageName];
    if (!dictionary) throw new Error(`Strings for package "${packageName}" were not included by LocalizedStringProvider. Please add it to the list passed to createLocalizedStringDictionary.`);
    return dictionary;
  }
  constructor(messages, defaultLocale = "en-US") {
    this.strings = Object.fromEntries(Object.entries(messages).filter(([, v]) => v)), this.defaultLocale = defaultLocale;
  }
};
function $5b160d28a433310d$var$getStringsForLocale(locale, strings, defaultLocale = "en-US") {
  if (strings[locale]) return strings[locale];
  let language = $5b160d28a433310d$var$getLanguage(locale);
  if (strings[language]) return strings[language];
  for (let key in strings)
    if (key.startsWith(language + "-")) return strings[key];
  return strings[defaultLocale];
}
function $5b160d28a433310d$var$getLanguage(locale) {
  return Intl.Locale ? new Intl.Locale(locale).language : locale.split("-")[0];
}

// ../node_modules/@internationalized/string/dist/LocalizedStringFormatter.mjs
var $6db58dc88e78b024$var$pluralRulesCache = /* @__PURE__ */ new Map(), $6db58dc88e78b024$var$numberFormatCache = /* @__PURE__ */ new Map(), $6db58dc88e78b024$export$2f817fcdc4b89ae0 = class {
  /** Formats a localized string for the given key with the provided variables. */
  format(key, variables) {
    let message = this.strings.getStringForLocale(key, this.locale);
    return typeof message == "function" ? message(variables, this) : message;
  }
  plural(count, options, type = "cardinal") {
    let opt = options["=" + count];
    if (opt) return typeof opt == "function" ? opt() : opt;
    let key = this.locale + ":" + type, pluralRules = $6db58dc88e78b024$var$pluralRulesCache.get(key);
    pluralRules || (pluralRules = new Intl.PluralRules(this.locale, {
      type
    }), $6db58dc88e78b024$var$pluralRulesCache.set(key, pluralRules));
    let selected = pluralRules.select(count);
    return opt = options[selected] || options.other, typeof opt == "function" ? opt() : opt;
  }
  number(value) {
    let numberFormat = $6db58dc88e78b024$var$numberFormatCache.get(this.locale);
    return numberFormat || (numberFormat = new Intl.NumberFormat(this.locale), $6db58dc88e78b024$var$numberFormatCache.set(this.locale, numberFormat)), numberFormat.format(value);
  }
  select(options, value) {
    let opt = options[value] || options.other;
    return typeof opt == "function" ? opt() : opt;
  }
  constructor(locale, strings) {
    this.locale = locale, this.strings = strings;
  }
};

// ../node_modules/@react-aria/i18n/dist/useLocalizedStringFormatter.mjs
import { useMemo as $6ksNp$useMemo } from "react";
var $fca6afa0e843324b$var$cache = /* @__PURE__ */ new WeakMap();
function $fca6afa0e843324b$var$getCachedDictionary(strings) {
  let dictionary = $fca6afa0e843324b$var$cache.get(strings);
  return dictionary || (dictionary = new $5b160d28a433310d$export$c17fa47878dc55b6(strings), $fca6afa0e843324b$var$cache.set(strings, dictionary)), dictionary;
}
function $fca6afa0e843324b$export$87b761675e8eaa10(strings, packageName) {
  return packageName && $5b160d28a433310d$export$c17fa47878dc55b6.getGlobalDictionaryForPackage(packageName) || $fca6afa0e843324b$var$getCachedDictionary(strings);
}
function $fca6afa0e843324b$export$f12b703ca79dfbb1(strings, packageName) {
  let { locale } = $18f2051aff69b9bf$export$43bb16f9c6d9e3f7(), dictionary = $fca6afa0e843324b$export$87b761675e8eaa10(strings, packageName);
  return $6ksNp$useMemo(() => new $6db58dc88e78b024$export$2f817fcdc4b89ae0(locale, dictionary), [
    locale,
    dictionary
  ]);
}

// ../node_modules/@react-aria/i18n/dist/useListFormatter.mjs
import { useMemo as $l9VVR$useMemo } from "react";

// ../node_modules/@internationalized/date/dist/string.mjs
var $fae977aafc393c5c$var$requiredDurationTimeGroups = [
  "hours",
  "minutes",
  "seconds"
], $fae977aafc393c5c$var$requiredDurationGroups = [
  "years",
  "months",
  "weeks",
  "days",
  ...$fae977aafc393c5c$var$requiredDurationTimeGroups
];

// ../node_modules/@internationalized/date/dist/HebrewCalendar.mjs
var $7c5f6fbf42389787$var$HOUR_PARTS = 1080, $7c5f6fbf42389787$var$DAY_PARTS = 24 * $7c5f6fbf42389787$var$HOUR_PARTS, $7c5f6fbf42389787$var$MONTH_DAYS = 29, $7c5f6fbf42389787$var$MONTH_FRACT = 12 * $7c5f6fbf42389787$var$HOUR_PARTS + 793, $7c5f6fbf42389787$var$MONTH_PARTS = $7c5f6fbf42389787$var$MONTH_DAYS * $7c5f6fbf42389787$var$DAY_PARTS + $7c5f6fbf42389787$var$MONTH_FRACT;

// ../node_modules/@react-aria/i18n/dist/useDateFormatter.mjs
import { useMemo as $6wxND$useMemo } from "react";

// ../node_modules/@internationalized/number/dist/NumberFormatter.mjs
var $488c6ddbf4ef74c2$var$formatterCache = /* @__PURE__ */ new Map(), $488c6ddbf4ef74c2$var$supportsSignDisplay = !1;
try {
  $488c6ddbf4ef74c2$var$supportsSignDisplay = new Intl.NumberFormat("de-DE", {
    signDisplay: "exceptZero"
  }).resolvedOptions().signDisplay === "exceptZero";
} catch {
}
var $488c6ddbf4ef74c2$var$supportsUnit = !1;
try {
  $488c6ddbf4ef74c2$var$supportsUnit = new Intl.NumberFormat("de-DE", {
    style: "unit",
    unit: "degree"
  }).resolvedOptions().style === "unit";
} catch {
}
var $488c6ddbf4ef74c2$var$UNITS = {
  degree: {
    narrow: {
      default: "\xB0",
      "ja-JP": " \u5EA6",
      "zh-TW": "\u5EA6",
      "sl-SI": " \xB0"
    }
  }
}, $488c6ddbf4ef74c2$export$cc77c4ff7e8673c5 = class {
  /** Formats a number value as a string, according to the locale and options provided to the constructor. */
  format(value) {
    let res = "";
    if (!$488c6ddbf4ef74c2$var$supportsSignDisplay && this.options.signDisplay != null ? res = $488c6ddbf4ef74c2$export$711b50b3c525e0f2(this.numberFormatter, this.options.signDisplay, value) : res = this.numberFormatter.format(value), this.options.style === "unit" && !$488c6ddbf4ef74c2$var$supportsUnit) {
      var _UNITS_unit;
      let { unit, unitDisplay = "short", locale } = this.resolvedOptions();
      if (!unit) return res;
      let values = (_UNITS_unit = $488c6ddbf4ef74c2$var$UNITS[unit]) === null || _UNITS_unit === void 0 ? void 0 : _UNITS_unit[unitDisplay];
      res += values[locale] || values.default;
    }
    return res;
  }
  /** Formats a number to an array of parts such as separators, digits, punctuation, and more. */
  formatToParts(value) {
    return this.numberFormatter.formatToParts(value);
  }
  /** Formats a number range as a string. */
  formatRange(start, end) {
    if (typeof this.numberFormatter.formatRange == "function") return this.numberFormatter.formatRange(start, end);
    if (end < start) throw new RangeError("End date must be >= start date");
    return `${this.format(start)} \u2013 ${this.format(end)}`;
  }
  /** Formats a number range as an array of parts. */
  formatRangeToParts(start, end) {
    if (typeof this.numberFormatter.formatRangeToParts == "function") return this.numberFormatter.formatRangeToParts(start, end);
    if (end < start) throw new RangeError("End date must be >= start date");
    let startParts = this.numberFormatter.formatToParts(start), endParts = this.numberFormatter.formatToParts(end);
    return [
      ...startParts.map((p) => ({
        ...p,
        source: "startRange"
      })),
      {
        type: "literal",
        value: " \u2013 ",
        source: "shared"
      },
      ...endParts.map((p) => ({
        ...p,
        source: "endRange"
      }))
    ];
  }
  /** Returns the resolved formatting options based on the values passed to the constructor. */
  resolvedOptions() {
    let options = this.numberFormatter.resolvedOptions();
    return !$488c6ddbf4ef74c2$var$supportsSignDisplay && this.options.signDisplay != null && (options = {
      ...options,
      signDisplay: this.options.signDisplay
    }), !$488c6ddbf4ef74c2$var$supportsUnit && this.options.style === "unit" && (options = {
      ...options,
      style: "unit",
      unit: this.options.unit,
      unitDisplay: this.options.unitDisplay
    }), options;
  }
  constructor(locale, options = {}) {
    this.numberFormatter = $488c6ddbf4ef74c2$var$getCachedNumberFormatter(locale, options), this.options = options;
  }
};
function $488c6ddbf4ef74c2$var$getCachedNumberFormatter(locale, options = {}) {
  let { numberingSystem } = options;
  if (numberingSystem && locale.includes("-nu-") && (locale.includes("-u-") || (locale += "-u-"), locale += `-nu-${numberingSystem}`), options.style === "unit" && !$488c6ddbf4ef74c2$var$supportsUnit) {
    var _UNITS_unit;
    let { unit, unitDisplay = "short" } = options;
    if (!unit) throw new Error('unit option must be provided with style: "unit"');
    if (!(!((_UNITS_unit = $488c6ddbf4ef74c2$var$UNITS[unit]) === null || _UNITS_unit === void 0) && _UNITS_unit[unitDisplay])) throw new Error(`Unsupported unit ${unit} with unitDisplay = ${unitDisplay}`);
    options = {
      ...options,
      style: "decimal"
    };
  }
  let cacheKey = locale + (options ? Object.entries(options).sort((a, b) => a[0] < b[0] ? -1 : 1).join() : "");
  if ($488c6ddbf4ef74c2$var$formatterCache.has(cacheKey)) return $488c6ddbf4ef74c2$var$formatterCache.get(cacheKey);
  let numberFormatter = new Intl.NumberFormat(locale, options);
  return $488c6ddbf4ef74c2$var$formatterCache.set(cacheKey, numberFormatter), numberFormatter;
}
function $488c6ddbf4ef74c2$export$711b50b3c525e0f2(numberFormat, signDisplay, num) {
  if (signDisplay === "auto") return numberFormat.format(num);
  if (signDisplay === "never") return numberFormat.format(Math.abs(num));
  {
    let needsPositiveSign = !1;
    if (signDisplay === "always" ? needsPositiveSign = num > 0 || Object.is(num, 0) : signDisplay === "exceptZero" && (Object.is(num, -0) || Object.is(num, 0) ? num = Math.abs(num) : needsPositiveSign = num > 0), needsPositiveSign) {
      let negative = numberFormat.format(-num), noSign = numberFormat.format(num), minus = negative.replace(noSign, "").replace(/\u200e|\u061C/, "");
      return [
        ...minus
      ].length !== 1 && console.warn("@react-aria/i18n polyfill for NumberFormat signDisplay: Unsupported case"), negative.replace(noSign, "!!!").replace(minus, "+").replace("!!!", noSign);
    } else return numberFormat.format(num);
  }
}

// ../node_modules/@internationalized/number/dist/NumberParser.mjs
var $6c7bd7858deea686$var$CURRENCY_SIGN_REGEX = new RegExp("^.*\\(.*\\).*$");

// ../node_modules/@react-aria/i18n/dist/useNumberFormatter.mjs
import { useMemo as $JFEdn$useMemo } from "react";
function $a916eb452884faea$export$b7a616150fdb9f44(options = {}) {
  let { locale } = $18f2051aff69b9bf$export$43bb16f9c6d9e3f7();
  return $JFEdn$useMemo(() => new $488c6ddbf4ef74c2$export$cc77c4ff7e8673c5(locale, options), [
    locale,
    options
  ]);
}

// ../node_modules/@react-aria/i18n/dist/useCollator.mjs
var $325a3faab7a68acd$var$cache = /* @__PURE__ */ new Map();
function $325a3faab7a68acd$export$a16aca283550c30d(options) {
  let { locale } = $18f2051aff69b9bf$export$43bb16f9c6d9e3f7(), cacheKey = locale + (options ? Object.entries(options).sort((a, b) => a[0] < b[0] ? -1 : 1).join() : "");
  if ($325a3faab7a68acd$var$cache.has(cacheKey)) return $325a3faab7a68acd$var$cache.get(cacheKey);
  let formatter = new Intl.Collator(locale, options);
  return $325a3faab7a68acd$var$cache.set(cacheKey, formatter), formatter;
}

// ../node_modules/@react-aria/i18n/dist/useFilter.mjs
import { useCallback as $21ck9$useCallback, useMemo as $21ck9$useMemo } from "react";

// ../node_modules/@react-aria/overlays/dist/useOverlayPosition.mjs
var $2a41e45df1593e64$var$visualViewport = typeof document < "u" ? window.visualViewport : null;
function $2a41e45df1593e64$export$d39e1813b3bdd0e1(props) {
  let { direction } = $18f2051aff69b9bf$export$43bb16f9c6d9e3f7(), { arrowSize, targetRef, overlayRef, arrowRef, scrollRef = overlayRef, placement = "bottom", containerPadding = 12, shouldFlip = !0, boundaryElement = typeof document < "u" ? document.body : null, offset = 0, crossOffset = 0, shouldUpdatePosition = !0, isOpen = !0, onClose, maxHeight, arrowBoundaryOffset = 0 } = props, [position, setPosition] = $39EOa$useState(null), deps = [
    shouldUpdatePosition,
    placement,
    overlayRef.current,
    targetRef.current,
    arrowRef?.current,
    scrollRef.current,
    containerPadding,
    shouldFlip,
    boundaryElement,
    offset,
    crossOffset,
    isOpen,
    direction,
    maxHeight,
    arrowBoundaryOffset,
    arrowSize
  ], lastScale = $39EOa$useRef($2a41e45df1593e64$var$visualViewport?.scale);
  $39EOa$useEffect(() => {
    isOpen && (lastScale.current = $2a41e45df1593e64$var$visualViewport?.scale);
  }, [
    isOpen
  ]);
  let updatePosition = $39EOa$useCallback(() => {
    if (shouldUpdatePosition === !1 || !isOpen || !overlayRef.current || !targetRef.current || !boundaryElement || $2a41e45df1593e64$var$visualViewport?.scale !== lastScale.current) return;
    let anchor = null;
    if (scrollRef.current && scrollRef.current.contains(document.activeElement)) {
      var _document_activeElement;
      let anchorRect = (_document_activeElement = document.activeElement) === null || _document_activeElement === void 0 ? void 0 : _document_activeElement.getBoundingClientRect(), scrollRect = scrollRef.current.getBoundingClientRect();
      var _anchorRect_top;
      if (anchor = {
        type: "top",
        offset: ((_anchorRect_top = anchorRect?.top) !== null && _anchorRect_top !== void 0 ? _anchorRect_top : 0) - scrollRect.top
      }, anchor.offset > scrollRect.height / 2) {
        anchor.type = "bottom";
        var _anchorRect_bottom;
        anchor.offset = ((_anchorRect_bottom = anchorRect?.bottom) !== null && _anchorRect_bottom !== void 0 ? _anchorRect_bottom : 0) - scrollRect.bottom;
      }
    }
    let overlay = overlayRef.current;
    if (!maxHeight && overlayRef.current) {
      var _window_visualViewport;
      overlay.style.top = "0px", overlay.style.bottom = "";
      var _window_visualViewport_height;
      overlay.style.maxHeight = ((_window_visualViewport_height = (_window_visualViewport = window.visualViewport) === null || _window_visualViewport === void 0 ? void 0 : _window_visualViewport.height) !== null && _window_visualViewport_height !== void 0 ? _window_visualViewport_height : window.innerHeight) + "px";
    }
    let position2 = $edcf132a9284368a$export$b3ceb0cbf1056d98({
      placement: $2a41e45df1593e64$var$translateRTL(placement, direction),
      overlayNode: overlayRef.current,
      targetNode: targetRef.current,
      scrollNode: scrollRef.current || overlayRef.current,
      padding: containerPadding,
      shouldFlip,
      boundaryElement,
      offset,
      crossOffset,
      maxHeight,
      arrowSize: arrowSize ?? (arrowRef?.current ? $edcf132a9284368a$export$4b834cebd9e5cebe(arrowRef.current, !0).width : 0),
      arrowBoundaryOffset
    });
    if (position2.position) {
      if (overlay.style.top = "", overlay.style.bottom = "", overlay.style.left = "", overlay.style.right = "", Object.keys(position2.position).forEach((key) => overlay.style[key] = position2.position[key] + "px"), overlay.style.maxHeight = position2.maxHeight != null ? position2.maxHeight + "px" : "", anchor && document.activeElement && scrollRef.current) {
        let anchorRect = document.activeElement.getBoundingClientRect(), scrollRect = scrollRef.current.getBoundingClientRect(), newOffset = anchorRect[anchor.type] - scrollRect[anchor.type];
        scrollRef.current.scrollTop += newOffset - anchor.offset;
      }
      setPosition(position2);
    }
  }, deps);
  $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(updatePosition, deps), $2a41e45df1593e64$var$useResize(updatePosition), $9daab02d461809db$export$683480f191c0e3ea({
    ref: overlayRef,
    onResize: updatePosition
  }), $9daab02d461809db$export$683480f191c0e3ea({
    ref: targetRef,
    onResize: updatePosition
  });
  let isResizing = $39EOa$useRef(!1);
  $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => {
    let timeout, onResize = () => {
      isResizing.current = !0, clearTimeout(timeout), timeout = setTimeout(() => {
        isResizing.current = !1;
      }, 500), updatePosition();
    }, onScroll = () => {
      isResizing.current && onResize();
    };
    return $2a41e45df1593e64$var$visualViewport?.addEventListener("resize", onResize), $2a41e45df1593e64$var$visualViewport?.addEventListener("scroll", onScroll), () => {
      $2a41e45df1593e64$var$visualViewport?.removeEventListener("resize", onResize), $2a41e45df1593e64$var$visualViewport?.removeEventListener("scroll", onScroll);
    };
  }, [
    updatePosition
  ]);
  let close = $39EOa$useCallback(() => {
    isResizing.current || onClose?.();
  }, [
    onClose,
    isResizing
  ]);
  $dd149f63282afbbf$export$18fc8428861184da({
    triggerRef: targetRef,
    isOpen,
    onClose: onClose && close
  });
  var _position_maxHeight, _position_placement, _position_triggerAnchorPoint;
  return {
    overlayProps: {
      style: {
        position: position ? "absolute" : "fixed",
        top: position ? void 0 : 0,
        left: position ? void 0 : 0,
        zIndex: 1e5,
        ...position?.position,
        maxHeight: (_position_maxHeight = position?.maxHeight) !== null && _position_maxHeight !== void 0 ? _position_maxHeight : "100vh"
      }
    },
    placement: (_position_placement = position?.placement) !== null && _position_placement !== void 0 ? _position_placement : null,
    triggerAnchorPoint: (_position_triggerAnchorPoint = position?.triggerAnchorPoint) !== null && _position_triggerAnchorPoint !== void 0 ? _position_triggerAnchorPoint : null,
    arrowProps: {
      "aria-hidden": "true",
      role: "presentation",
      style: {
        left: position?.arrowOffsetLeft,
        top: position?.arrowOffsetTop
      }
    },
    updatePosition
  };
}
function $2a41e45df1593e64$var$useResize(onResize) {
  $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => (window.addEventListener("resize", onResize, !1), () => {
    window.removeEventListener("resize", onResize, !1);
  }), [
    onResize
  ]);
}
function $2a41e45df1593e64$var$translateRTL(position, direction) {
  return direction === "rtl" ? position.replace("start", "right").replace("end", "left") : position.replace("start", "left").replace("end", "right");
}

// ../node_modules/@react-aria/focus/dist/FocusScope.mjs
import $cgawC$react, { useRef as $cgawC$useRef, useContext as $cgawC$useContext, useMemo as $cgawC$useMemo, useEffect as $cgawC$useEffect } from "react";
var $9bf71ea28793e738$var$FocusContext = $cgawC$react.createContext(null), $9bf71ea28793e738$var$RESTORE_FOCUS_EVENT = "react-aria-focus-scope-restore", $9bf71ea28793e738$var$activeScope = null;
function $9bf71ea28793e738$export$20e40289641fbbb6(props) {
  let { children, contain, restoreFocus, autoFocus } = props, startRef = $cgawC$useRef(null), endRef = $cgawC$useRef(null), scopeRef = $cgawC$useRef([]), { parentNode } = $cgawC$useContext($9bf71ea28793e738$var$FocusContext) || {}, node = $cgawC$useMemo(() => new $9bf71ea28793e738$var$TreeNode({
    scopeRef
  }), [
    scopeRef
  ]);
  $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => {
    let parent = parentNode || $9bf71ea28793e738$export$d06fae2ee68b101e.root;
    if ($9bf71ea28793e738$export$d06fae2ee68b101e.getTreeNode(parent.scopeRef) && $9bf71ea28793e738$var$activeScope && !$9bf71ea28793e738$var$isAncestorScope($9bf71ea28793e738$var$activeScope, parent.scopeRef)) {
      let activeNode = $9bf71ea28793e738$export$d06fae2ee68b101e.getTreeNode($9bf71ea28793e738$var$activeScope);
      activeNode && (parent = activeNode);
    }
    parent.addChild(node), $9bf71ea28793e738$export$d06fae2ee68b101e.addNode(node);
  }, [
    node,
    parentNode
  ]), $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => {
    let node2 = $9bf71ea28793e738$export$d06fae2ee68b101e.getTreeNode(scopeRef);
    node2 && (node2.contain = !!contain);
  }, [
    contain
  ]), $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => {
    var _startRef_current;
    let node2 = (_startRef_current = startRef.current) === null || _startRef_current === void 0 ? void 0 : _startRef_current.nextSibling, nodes = [], stopPropagation = (e) => e.stopPropagation();
    for (; node2 && node2 !== endRef.current; )
      nodes.push(node2), node2.addEventListener($9bf71ea28793e738$var$RESTORE_FOCUS_EVENT, stopPropagation), node2 = node2.nextSibling;
    return scopeRef.current = nodes, () => {
      for (let node3 of nodes) node3.removeEventListener($9bf71ea28793e738$var$RESTORE_FOCUS_EVENT, stopPropagation);
    };
  }, [
    children
  ]), $9bf71ea28793e738$var$useActiveScopeTracker(scopeRef, restoreFocus, contain), $9bf71ea28793e738$var$useFocusContainment(scopeRef, contain), $9bf71ea28793e738$var$useRestoreFocus(scopeRef, restoreFocus, contain), $9bf71ea28793e738$var$useAutoFocus(scopeRef, autoFocus), $cgawC$useEffect(() => {
    let activeElement = $d4ee10de306f2510$export$cd4e5573fbe2b576($431fbd86ca7dc216$export$b204af158042fbac(scopeRef.current ? scopeRef.current[0] : void 0)), scope = null;
    if ($9bf71ea28793e738$var$isElementInScope(activeElement, scopeRef.current)) {
      for (let node2 of $9bf71ea28793e738$export$d06fae2ee68b101e.traverse()) node2.scopeRef && $9bf71ea28793e738$var$isElementInScope(activeElement, node2.scopeRef.current) && (scope = node2);
      scope === $9bf71ea28793e738$export$d06fae2ee68b101e.getTreeNode(scopeRef) && ($9bf71ea28793e738$var$activeScope = scope.scopeRef);
    }
  }, [
    scopeRef
  ]), $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => () => {
    var _focusScopeTree_getTreeNode_parent, _focusScopeTree_getTreeNode, _focusScopeTree_getTreeNode_parent_scopeRef;
    let parentScope = (_focusScopeTree_getTreeNode_parent_scopeRef = (_focusScopeTree_getTreeNode = $9bf71ea28793e738$export$d06fae2ee68b101e.getTreeNode(scopeRef)) === null || _focusScopeTree_getTreeNode === void 0 || (_focusScopeTree_getTreeNode_parent = _focusScopeTree_getTreeNode.parent) === null || _focusScopeTree_getTreeNode_parent === void 0 ? void 0 : _focusScopeTree_getTreeNode_parent.scopeRef) !== null && _focusScopeTree_getTreeNode_parent_scopeRef !== void 0 ? _focusScopeTree_getTreeNode_parent_scopeRef : null;
    (scopeRef === $9bf71ea28793e738$var$activeScope || $9bf71ea28793e738$var$isAncestorScope(scopeRef, $9bf71ea28793e738$var$activeScope)) && (!parentScope || $9bf71ea28793e738$export$d06fae2ee68b101e.getTreeNode(parentScope)) && ($9bf71ea28793e738$var$activeScope = parentScope), $9bf71ea28793e738$export$d06fae2ee68b101e.removeTreeNode(scopeRef);
  }, [
    scopeRef
  ]);
  let focusManager = $cgawC$useMemo(() => $9bf71ea28793e738$var$createFocusManagerForScope(scopeRef), []), value = $cgawC$useMemo(() => ({
    focusManager,
    parentNode: node
  }), [
    node,
    focusManager
  ]);
  return $cgawC$react.createElement($9bf71ea28793e738$var$FocusContext.Provider, {
    value
  }, $cgawC$react.createElement("span", {
    "data-focus-scope-start": !0,
    hidden: !0,
    ref: startRef
  }), children, $cgawC$react.createElement("span", {
    "data-focus-scope-end": !0,
    hidden: !0,
    ref: endRef
  }));
}
function $9bf71ea28793e738$var$createFocusManagerForScope(scopeRef) {
  return {
    focusNext(opts = {}) {
      let scope = scopeRef.current, { from, tabbable, wrap, accept } = opts;
      var _scope_;
      let node = from || $d4ee10de306f2510$export$cd4e5573fbe2b576($431fbd86ca7dc216$export$b204af158042fbac((_scope_ = scope[0]) !== null && _scope_ !== void 0 ? _scope_ : void 0)), sentinel = scope[0].previousElementSibling, scopeRoot = $9bf71ea28793e738$var$getScopeRoot(scope), walker = $9bf71ea28793e738$export$2d6ec8fc375ceafa(scopeRoot, {
        tabbable,
        accept
      }, scope);
      walker.currentNode = $9bf71ea28793e738$var$isElementInScope(node, scope) ? node : sentinel;
      let nextNode = walker.nextNode();
      return !nextNode && wrap && (walker.currentNode = sentinel, nextNode = walker.nextNode()), nextNode && $9bf71ea28793e738$var$focusElement(nextNode, !0), nextNode;
    },
    focusPrevious(opts = {}) {
      let scope = scopeRef.current, { from, tabbable, wrap, accept } = opts;
      var _scope_;
      let node = from || $d4ee10de306f2510$export$cd4e5573fbe2b576($431fbd86ca7dc216$export$b204af158042fbac((_scope_ = scope[0]) !== null && _scope_ !== void 0 ? _scope_ : void 0)), sentinel = scope[scope.length - 1].nextElementSibling, scopeRoot = $9bf71ea28793e738$var$getScopeRoot(scope), walker = $9bf71ea28793e738$export$2d6ec8fc375ceafa(scopeRoot, {
        tabbable,
        accept
      }, scope);
      walker.currentNode = $9bf71ea28793e738$var$isElementInScope(node, scope) ? node : sentinel;
      let previousNode = walker.previousNode();
      return !previousNode && wrap && (walker.currentNode = sentinel, previousNode = walker.previousNode()), previousNode && $9bf71ea28793e738$var$focusElement(previousNode, !0), previousNode;
    },
    focusFirst(opts = {}) {
      let scope = scopeRef.current, { tabbable, accept } = opts, scopeRoot = $9bf71ea28793e738$var$getScopeRoot(scope), walker = $9bf71ea28793e738$export$2d6ec8fc375ceafa(scopeRoot, {
        tabbable,
        accept
      }, scope);
      walker.currentNode = scope[0].previousElementSibling;
      let nextNode = walker.nextNode();
      return nextNode && $9bf71ea28793e738$var$focusElement(nextNode, !0), nextNode;
    },
    focusLast(opts = {}) {
      let scope = scopeRef.current, { tabbable, accept } = opts, scopeRoot = $9bf71ea28793e738$var$getScopeRoot(scope), walker = $9bf71ea28793e738$export$2d6ec8fc375ceafa(scopeRoot, {
        tabbable,
        accept
      }, scope);
      walker.currentNode = scope[scope.length - 1].nextElementSibling;
      let previousNode = walker.previousNode();
      return previousNode && $9bf71ea28793e738$var$focusElement(previousNode, !0), previousNode;
    }
  };
}
function $9bf71ea28793e738$var$getScopeRoot(scope) {
  return scope[0].parentElement;
}
function $9bf71ea28793e738$var$shouldContainFocus(scopeRef) {
  let scope = $9bf71ea28793e738$export$d06fae2ee68b101e.getTreeNode($9bf71ea28793e738$var$activeScope);
  for (; scope && scope.scopeRef !== scopeRef; ) {
    if (scope.contain) return !1;
    scope = scope.parent;
  }
  return !0;
}
function $9bf71ea28793e738$var$isTabbableRadio(element) {
  if (element.checked) return !0;
  let radios = [];
  if (!element.form) radios = [
    ...$431fbd86ca7dc216$export$b204af158042fbac(element).querySelectorAll(`input[type="radio"][name="${CSS.escape(element.name)}"]`)
  ].filter((radio) => !radio.form);
  else {
    var _element_form_elements, _element_form;
    let radioList = (_element_form = element.form) === null || _element_form === void 0 || (_element_form_elements = _element_form.elements) === null || _element_form_elements === void 0 ? void 0 : _element_form_elements.namedItem(element.name);
    radios = [
      ...radioList ?? []
    ];
  }
  return radios ? !radios.some((radio) => radio.checked) : !1;
}
function $9bf71ea28793e738$var$useFocusContainment(scopeRef, contain) {
  let focusedNode = $cgawC$useRef(void 0), raf = $cgawC$useRef(void 0);
  $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => {
    let scope = scopeRef.current;
    if (!contain) {
      raf.current && (cancelAnimationFrame(raf.current), raf.current = void 0);
      return;
    }
    let ownerDocument = $431fbd86ca7dc216$export$b204af158042fbac(scope ? scope[0] : void 0), onKeyDown = (e) => {
      if (e.key !== "Tab" || e.altKey || e.ctrlKey || e.metaKey || !$9bf71ea28793e738$var$shouldContainFocus(scopeRef) || e.isComposing) return;
      let focusedElement = $d4ee10de306f2510$export$cd4e5573fbe2b576(ownerDocument), scope2 = scopeRef.current;
      if (!scope2 || !$9bf71ea28793e738$var$isElementInScope(focusedElement, scope2)) return;
      let scopeRoot = $9bf71ea28793e738$var$getScopeRoot(scope2), walker = $9bf71ea28793e738$export$2d6ec8fc375ceafa(scopeRoot, {
        tabbable: !0
      }, scope2);
      if (!focusedElement) return;
      walker.currentNode = focusedElement;
      let nextElement = e.shiftKey ? walker.previousNode() : walker.nextNode();
      nextElement || (walker.currentNode = e.shiftKey ? scope2[scope2.length - 1].nextElementSibling : scope2[0].previousElementSibling, nextElement = e.shiftKey ? walker.previousNode() : walker.nextNode()), e.preventDefault(), nextElement && $9bf71ea28793e738$var$focusElement(nextElement, !0);
    }, onFocus = (e) => {
      (!$9bf71ea28793e738$var$activeScope || $9bf71ea28793e738$var$isAncestorScope($9bf71ea28793e738$var$activeScope, scopeRef)) && $9bf71ea28793e738$var$isElementInScope($d4ee10de306f2510$export$e58f029f0fbfdb29(e), scopeRef.current) ? ($9bf71ea28793e738$var$activeScope = scopeRef, focusedNode.current = $d4ee10de306f2510$export$e58f029f0fbfdb29(e)) : $9bf71ea28793e738$var$shouldContainFocus(scopeRef) && !$9bf71ea28793e738$var$isElementInChildScope($d4ee10de306f2510$export$e58f029f0fbfdb29(e), scopeRef) ? focusedNode.current ? focusedNode.current.focus() : $9bf71ea28793e738$var$activeScope && $9bf71ea28793e738$var$activeScope.current && $9bf71ea28793e738$var$focusFirstInScope($9bf71ea28793e738$var$activeScope.current) : $9bf71ea28793e738$var$shouldContainFocus(scopeRef) && (focusedNode.current = $d4ee10de306f2510$export$e58f029f0fbfdb29(e));
    }, onBlur = (e) => {
      raf.current && cancelAnimationFrame(raf.current), raf.current = requestAnimationFrame(() => {
        let modality = $507fabe10e71c6fb$export$630ff653c5ada6a9(), shouldSkipFocusRestore = (modality === "virtual" || modality === null) && $c87311424ea30a05$export$a11b0059900ceec8() && $c87311424ea30a05$export$6446a186d09e379e(), activeElement = $d4ee10de306f2510$export$cd4e5573fbe2b576(ownerDocument);
        if (!shouldSkipFocusRestore && activeElement && $9bf71ea28793e738$var$shouldContainFocus(scopeRef) && !$9bf71ea28793e738$var$isElementInChildScope(activeElement, scopeRef)) {
          $9bf71ea28793e738$var$activeScope = scopeRef;
          let target = $d4ee10de306f2510$export$e58f029f0fbfdb29(e);
          if (target && target.isConnected) {
            var _focusedNode_current;
            focusedNode.current = target, (_focusedNode_current = focusedNode.current) === null || _focusedNode_current === void 0 || _focusedNode_current.focus();
          } else $9bf71ea28793e738$var$activeScope.current && $9bf71ea28793e738$var$focusFirstInScope($9bf71ea28793e738$var$activeScope.current);
        }
      });
    };
    return ownerDocument.addEventListener("keydown", onKeyDown, !1), ownerDocument.addEventListener("focusin", onFocus, !1), scope?.forEach((element) => element.addEventListener("focusin", onFocus, !1)), scope?.forEach((element) => element.addEventListener("focusout", onBlur, !1)), () => {
      ownerDocument.removeEventListener("keydown", onKeyDown, !1), ownerDocument.removeEventListener("focusin", onFocus, !1), scope?.forEach((element) => element.removeEventListener("focusin", onFocus, !1)), scope?.forEach((element) => element.removeEventListener("focusout", onBlur, !1));
    };
  }, [
    scopeRef,
    contain
  ]), $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => () => {
    raf.current && cancelAnimationFrame(raf.current);
  }, [
    raf
  ]);
}
function $9bf71ea28793e738$var$isElementInAnyScope(element) {
  return $9bf71ea28793e738$var$isElementInChildScope(element);
}
function $9bf71ea28793e738$var$isElementInScope(element, scope) {
  return !element || !scope ? !1 : scope.some((node) => node.contains(element));
}
function $9bf71ea28793e738$var$isElementInChildScope(element, scope = null) {
  if (element instanceof Element && element.closest("[data-react-aria-top-layer]")) return !0;
  for (let { scopeRef: s } of $9bf71ea28793e738$export$d06fae2ee68b101e.traverse($9bf71ea28793e738$export$d06fae2ee68b101e.getTreeNode(scope)))
    if (s && $9bf71ea28793e738$var$isElementInScope(element, s.current)) return !0;
  return !1;
}
function $9bf71ea28793e738$export$1258395f99bf9cbf(element) {
  return $9bf71ea28793e738$var$isElementInChildScope(element, $9bf71ea28793e738$var$activeScope);
}
function $9bf71ea28793e738$var$isAncestorScope(ancestor, scope) {
  var _focusScopeTree_getTreeNode;
  let parent = (_focusScopeTree_getTreeNode = $9bf71ea28793e738$export$d06fae2ee68b101e.getTreeNode(scope)) === null || _focusScopeTree_getTreeNode === void 0 ? void 0 : _focusScopeTree_getTreeNode.parent;
  for (; parent; ) {
    if (parent.scopeRef === ancestor) return !0;
    parent = parent.parent;
  }
  return !1;
}
function $9bf71ea28793e738$var$focusElement(element, scroll = !1) {
  if (element != null && !scroll) try {
    $3ad3f6e1647bc98d$export$80f3e147d781571c(element);
  } catch {
  }
  else if (element != null) try {
    element.focus();
  } catch {
  }
}
function $9bf71ea28793e738$var$getFirstInScope(scope, tabbable = !0) {
  let sentinel = scope[0].previousElementSibling, scopeRoot = $9bf71ea28793e738$var$getScopeRoot(scope), walker = $9bf71ea28793e738$export$2d6ec8fc375ceafa(scopeRoot, {
    tabbable
  }, scope);
  walker.currentNode = sentinel;
  let nextNode = walker.nextNode();
  return tabbable && !nextNode && (scopeRoot = $9bf71ea28793e738$var$getScopeRoot(scope), walker = $9bf71ea28793e738$export$2d6ec8fc375ceafa(scopeRoot, {
    tabbable: !1
  }, scope), walker.currentNode = sentinel, nextNode = walker.nextNode()), nextNode;
}
function $9bf71ea28793e738$var$focusFirstInScope(scope, tabbable = !0) {
  $9bf71ea28793e738$var$focusElement($9bf71ea28793e738$var$getFirstInScope(scope, tabbable));
}
function $9bf71ea28793e738$var$useAutoFocus(scopeRef, autoFocus) {
  let autoFocusRef = $cgawC$react.useRef(autoFocus);
  $cgawC$useEffect(() => {
    if (autoFocusRef.current) {
      $9bf71ea28793e738$var$activeScope = scopeRef;
      let ownerDocument = $431fbd86ca7dc216$export$b204af158042fbac(scopeRef.current ? scopeRef.current[0] : void 0);
      !$9bf71ea28793e738$var$isElementInScope($d4ee10de306f2510$export$cd4e5573fbe2b576(ownerDocument), $9bf71ea28793e738$var$activeScope.current) && scopeRef.current && $9bf71ea28793e738$var$focusFirstInScope(scopeRef.current);
    }
    autoFocusRef.current = !1;
  }, [
    scopeRef
  ]);
}
function $9bf71ea28793e738$var$useActiveScopeTracker(scopeRef, restore, contain) {
  $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => {
    if (restore || contain) return;
    let scope = scopeRef.current, ownerDocument = $431fbd86ca7dc216$export$b204af158042fbac(scope ? scope[0] : void 0), onFocus = (e) => {
      let target = $d4ee10de306f2510$export$e58f029f0fbfdb29(e);
      $9bf71ea28793e738$var$isElementInScope(target, scopeRef.current) ? $9bf71ea28793e738$var$activeScope = scopeRef : $9bf71ea28793e738$var$isElementInAnyScope(target) || ($9bf71ea28793e738$var$activeScope = null);
    };
    return ownerDocument.addEventListener("focusin", onFocus, !1), scope?.forEach((element) => element.addEventListener("focusin", onFocus, !1)), () => {
      ownerDocument.removeEventListener("focusin", onFocus, !1), scope?.forEach((element) => element.removeEventListener("focusin", onFocus, !1));
    };
  }, [
    scopeRef,
    restore,
    contain
  ]);
}
function $9bf71ea28793e738$var$shouldRestoreFocus(scopeRef) {
  let scope = $9bf71ea28793e738$export$d06fae2ee68b101e.getTreeNode($9bf71ea28793e738$var$activeScope);
  for (; scope && scope.scopeRef !== scopeRef; ) {
    if (scope.nodeToRestore) return !1;
    scope = scope.parent;
  }
  return scope?.scopeRef === scopeRef;
}
function $9bf71ea28793e738$var$useRestoreFocus(scopeRef, restoreFocus, contain) {
  let nodeToRestoreRef = $cgawC$useRef(typeof document < "u" ? $d4ee10de306f2510$export$cd4e5573fbe2b576($431fbd86ca7dc216$export$b204af158042fbac(scopeRef.current ? scopeRef.current[0] : void 0)) : null);
  $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => {
    let scope = scopeRef.current, ownerDocument = $431fbd86ca7dc216$export$b204af158042fbac(scope ? scope[0] : void 0);
    if (!restoreFocus || contain) return;
    let onFocus = () => {
      (!$9bf71ea28793e738$var$activeScope || $9bf71ea28793e738$var$isAncestorScope($9bf71ea28793e738$var$activeScope, scopeRef)) && $9bf71ea28793e738$var$isElementInScope($d4ee10de306f2510$export$cd4e5573fbe2b576(ownerDocument), scopeRef.current) && ($9bf71ea28793e738$var$activeScope = scopeRef);
    };
    return ownerDocument.addEventListener("focusin", onFocus, !1), scope?.forEach((element) => element.addEventListener("focusin", onFocus, !1)), () => {
      ownerDocument.removeEventListener("focusin", onFocus, !1), scope?.forEach((element) => element.removeEventListener("focusin", onFocus, !1));
    };
  }, [
    scopeRef,
    contain
  ]), $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => {
    let ownerDocument = $431fbd86ca7dc216$export$b204af158042fbac(scopeRef.current ? scopeRef.current[0] : void 0);
    if (!restoreFocus) return;
    let onKeyDown = (e) => {
      if (e.key !== "Tab" || e.altKey || e.ctrlKey || e.metaKey || !$9bf71ea28793e738$var$shouldContainFocus(scopeRef) || e.isComposing) return;
      let focusedElement = ownerDocument.activeElement;
      if (!$9bf71ea28793e738$var$isElementInChildScope(focusedElement, scopeRef) || !$9bf71ea28793e738$var$shouldRestoreFocus(scopeRef)) return;
      let treeNode = $9bf71ea28793e738$export$d06fae2ee68b101e.getTreeNode(scopeRef);
      if (!treeNode) return;
      let nodeToRestore = treeNode.nodeToRestore, walker = $9bf71ea28793e738$export$2d6ec8fc375ceafa(ownerDocument.body, {
        tabbable: !0
      });
      walker.currentNode = focusedElement;
      let nextElement = e.shiftKey ? walker.previousNode() : walker.nextNode();
      if ((!nodeToRestore || !nodeToRestore.isConnected || nodeToRestore === ownerDocument.body) && (nodeToRestore = void 0, treeNode.nodeToRestore = void 0), (!nextElement || !$9bf71ea28793e738$var$isElementInChildScope(nextElement, scopeRef)) && nodeToRestore) {
        walker.currentNode = nodeToRestore;
        do
          nextElement = e.shiftKey ? walker.previousNode() : walker.nextNode();
        while ($9bf71ea28793e738$var$isElementInChildScope(nextElement, scopeRef));
        e.preventDefault(), e.stopPropagation(), nextElement ? $9bf71ea28793e738$var$focusElement(nextElement, !0) : $9bf71ea28793e738$var$isElementInAnyScope(nodeToRestore) ? $9bf71ea28793e738$var$focusElement(nodeToRestore, !0) : focusedElement.blur();
      }
    };
    return contain || ownerDocument.addEventListener("keydown", onKeyDown, !0), () => {
      contain || ownerDocument.removeEventListener("keydown", onKeyDown, !0);
    };
  }, [
    scopeRef,
    restoreFocus,
    contain
  ]), $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => {
    let ownerDocument = $431fbd86ca7dc216$export$b204af158042fbac(scopeRef.current ? scopeRef.current[0] : void 0);
    if (!restoreFocus) return;
    let treeNode = $9bf71ea28793e738$export$d06fae2ee68b101e.getTreeNode(scopeRef);
    if (treeNode) {
      var _nodeToRestoreRef_current;
      return treeNode.nodeToRestore = (_nodeToRestoreRef_current = nodeToRestoreRef.current) !== null && _nodeToRestoreRef_current !== void 0 ? _nodeToRestoreRef_current : void 0, () => {
        let treeNode2 = $9bf71ea28793e738$export$d06fae2ee68b101e.getTreeNode(scopeRef);
        if (!treeNode2) return;
        let nodeToRestore = treeNode2.nodeToRestore, activeElement = $d4ee10de306f2510$export$cd4e5573fbe2b576(ownerDocument);
        if (restoreFocus && nodeToRestore && (activeElement && $9bf71ea28793e738$var$isElementInChildScope(activeElement, scopeRef) || activeElement === ownerDocument.body && $9bf71ea28793e738$var$shouldRestoreFocus(scopeRef))) {
          let clonedTree = $9bf71ea28793e738$export$d06fae2ee68b101e.clone();
          requestAnimationFrame(() => {
            if (ownerDocument.activeElement === ownerDocument.body) {
              let treeNode3 = clonedTree.getTreeNode(scopeRef);
              for (; treeNode3; ) {
                if (treeNode3.nodeToRestore && treeNode3.nodeToRestore.isConnected) {
                  $9bf71ea28793e738$var$restoreFocusToElement(treeNode3.nodeToRestore);
                  return;
                }
                treeNode3 = treeNode3.parent;
              }
              for (treeNode3 = clonedTree.getTreeNode(scopeRef); treeNode3; ) {
                if (treeNode3.scopeRef && treeNode3.scopeRef.current && $9bf71ea28793e738$export$d06fae2ee68b101e.getTreeNode(treeNode3.scopeRef)) {
                  let node = $9bf71ea28793e738$var$getFirstInScope(treeNode3.scopeRef.current, !0);
                  $9bf71ea28793e738$var$restoreFocusToElement(node);
                  return;
                }
                treeNode3 = treeNode3.parent;
              }
            }
          });
        }
      };
    }
  }, [
    scopeRef,
    restoreFocus
  ]);
}
function $9bf71ea28793e738$var$restoreFocusToElement(node) {
  node.dispatchEvent(new CustomEvent($9bf71ea28793e738$var$RESTORE_FOCUS_EVENT, {
    bubbles: !0,
    cancelable: !0
  })) && $9bf71ea28793e738$var$focusElement(node);
}
function $9bf71ea28793e738$export$2d6ec8fc375ceafa(root, opts, scope) {
  let filter = opts?.tabbable ? $b4b717babfbb907b$export$bebd5a1431fec25d : $b4b717babfbb907b$export$4c063cf1350e6fed, rootElement = root?.nodeType === Node.ELEMENT_NODE ? root : null, doc = $431fbd86ca7dc216$export$b204af158042fbac(rootElement), walker = $dfc540311bf7f109$export$4d0f8be8b12a7ef6(doc, root || doc, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      var _opts_from;
      return !(opts == null || (_opts_from = opts.from) === null || _opts_from === void 0) && _opts_from.contains(node) || opts?.tabbable && node.tagName === "INPUT" && node.getAttribute("type") === "radio" && (!$9bf71ea28793e738$var$isTabbableRadio(node) || walker.currentNode.tagName === "INPUT" && walker.currentNode.type === "radio" && walker.currentNode.name === node.name) ? NodeFilter.FILTER_REJECT : filter(node) && (!scope || $9bf71ea28793e738$var$isElementInScope(node, scope)) && (!opts?.accept || opts.accept(node)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  return opts?.from && (walker.currentNode = opts.from), walker;
}
function $9bf71ea28793e738$export$c5251b9e124bf29(ref, defaultOptions = {}) {
  return {
    focusNext(opts = {}) {
      let root = ref.current;
      if (!root) return null;
      let { from, tabbable = defaultOptions.tabbable, wrap = defaultOptions.wrap, accept = defaultOptions.accept } = opts, node = from || $d4ee10de306f2510$export$cd4e5573fbe2b576($431fbd86ca7dc216$export$b204af158042fbac(root)), walker = $9bf71ea28793e738$export$2d6ec8fc375ceafa(root, {
        tabbable,
        accept
      });
      root.contains(node) && (walker.currentNode = node);
      let nextNode = walker.nextNode();
      return !nextNode && wrap && (walker.currentNode = root, nextNode = walker.nextNode()), nextNode && $9bf71ea28793e738$var$focusElement(nextNode, !0), nextNode;
    },
    focusPrevious(opts = defaultOptions) {
      let root = ref.current;
      if (!root) return null;
      let { from, tabbable = defaultOptions.tabbable, wrap = defaultOptions.wrap, accept = defaultOptions.accept } = opts, node = from || $d4ee10de306f2510$export$cd4e5573fbe2b576($431fbd86ca7dc216$export$b204af158042fbac(root)), walker = $9bf71ea28793e738$export$2d6ec8fc375ceafa(root, {
        tabbable,
        accept
      });
      if (root.contains(node)) walker.currentNode = node;
      else {
        let next = $9bf71ea28793e738$var$last(walker);
        return next && $9bf71ea28793e738$var$focusElement(next, !0), next ?? null;
      }
      let previousNode = walker.previousNode();
      if (!previousNode && wrap) {
        walker.currentNode = root;
        let lastNode = $9bf71ea28793e738$var$last(walker);
        if (!lastNode)
          return null;
        previousNode = lastNode;
      }
      return previousNode && $9bf71ea28793e738$var$focusElement(previousNode, !0), previousNode ?? null;
    },
    focusFirst(opts = defaultOptions) {
      let root = ref.current;
      if (!root) return null;
      let { tabbable = defaultOptions.tabbable, accept = defaultOptions.accept } = opts, nextNode = $9bf71ea28793e738$export$2d6ec8fc375ceafa(root, {
        tabbable,
        accept
      }).nextNode();
      return nextNode && $9bf71ea28793e738$var$focusElement(nextNode, !0), nextNode;
    },
    focusLast(opts = defaultOptions) {
      let root = ref.current;
      if (!root) return null;
      let { tabbable = defaultOptions.tabbable, accept = defaultOptions.accept } = opts, walker = $9bf71ea28793e738$export$2d6ec8fc375ceafa(root, {
        tabbable,
        accept
      }), next = $9bf71ea28793e738$var$last(walker);
      return next && $9bf71ea28793e738$var$focusElement(next, !0), next ?? null;
    }
  };
}
function $9bf71ea28793e738$var$last(walker) {
  let next, last;
  do
    last = walker.lastChild(), last && (next = last);
  while (last);
  return next;
}
var $9bf71ea28793e738$var$Tree = class _$9bf71ea28793e738$var$Tree {
  get size() {
    return this.fastMap.size;
  }
  getTreeNode(data) {
    return this.fastMap.get(data);
  }
  addTreeNode(scopeRef, parent, nodeToRestore) {
    let parentNode = this.fastMap.get(parent ?? null);
    if (!parentNode) return;
    let node = new $9bf71ea28793e738$var$TreeNode({
      scopeRef
    });
    parentNode.addChild(node), node.parent = parentNode, this.fastMap.set(scopeRef, node), nodeToRestore && (node.nodeToRestore = nodeToRestore);
  }
  addNode(node) {
    this.fastMap.set(node.scopeRef, node);
  }
  removeTreeNode(scopeRef) {
    if (scopeRef === null) return;
    let node = this.fastMap.get(scopeRef);
    if (!node) return;
    let parentNode = node.parent;
    for (let current of this.traverse()) current !== node && node.nodeToRestore && current.nodeToRestore && node.scopeRef && node.scopeRef.current && $9bf71ea28793e738$var$isElementInScope(current.nodeToRestore, node.scopeRef.current) && (current.nodeToRestore = node.nodeToRestore);
    let children = node.children;
    parentNode && (parentNode.removeChild(node), children.size > 0 && children.forEach((child) => parentNode && parentNode.addChild(child))), this.fastMap.delete(node.scopeRef);
  }
  // Pre Order Depth First
  *traverse(node = this.root) {
    if (node.scopeRef != null && (yield node), node.children.size > 0) for (let child of node.children) yield* this.traverse(child);
  }
  clone() {
    var _node_parent;
    let newTree = new _$9bf71ea28793e738$var$Tree();
    var _node_parent_scopeRef;
    for (let node of this.traverse()) newTree.addTreeNode(node.scopeRef, (_node_parent_scopeRef = (_node_parent = node.parent) === null || _node_parent === void 0 ? void 0 : _node_parent.scopeRef) !== null && _node_parent_scopeRef !== void 0 ? _node_parent_scopeRef : null, node.nodeToRestore);
    return newTree;
  }
  constructor() {
    this.fastMap = /* @__PURE__ */ new Map(), this.root = new $9bf71ea28793e738$var$TreeNode({
      scopeRef: null
    }), this.fastMap.set(null, this.root);
  }
}, $9bf71ea28793e738$var$TreeNode = class {
  addChild(node) {
    this.children.add(node), node.parent = this;
  }
  removeChild(node) {
    this.children.delete(node), node.parent = void 0;
  }
  constructor(props) {
    this.children = /* @__PURE__ */ new Set(), this.contain = !1, this.scopeRef = props.scopeRef;
  }
}, $9bf71ea28793e738$export$d06fae2ee68b101e = new $9bf71ea28793e738$var$Tree();

// ../node_modules/@react-aria/focus/dist/useFocusRing.mjs
import { useRef as $isWE5$useRef, useState as $isWE5$useState, useCallback as $isWE5$useCallback } from "react";
function $f7dceffc5ad7768b$export$4e328f61c538687f(props = {}) {
  let { autoFocus = !1, isTextInput, within } = props, state = $isWE5$useRef({
    isFocused: !1,
    isFocusVisible: autoFocus || $507fabe10e71c6fb$export$b9b3dfddab17db27()
  }), [isFocused, setFocused] = $isWE5$useState(!1), [isFocusVisibleState, setFocusVisible] = $isWE5$useState(() => state.current.isFocused && state.current.isFocusVisible), updateState2 = $isWE5$useCallback(() => setFocusVisible(state.current.isFocused && state.current.isFocusVisible), []), onFocusChange = $isWE5$useCallback((isFocused2) => {
    state.current.isFocused = isFocused2, setFocused(isFocused2), updateState2();
  }, [
    updateState2
  ]);
  $507fabe10e71c6fb$export$ec71b4b83ac08ec3((isFocusVisible) => {
    state.current.isFocusVisible = isFocusVisible, updateState2();
  }, [], {
    isTextInput
  });
  let { focusProps } = $a1ea59d68270f0dd$export$f8168d8dd8fd66e6({
    isDisabled: within,
    onFocusChange
  }), { focusWithinProps } = $9ab94262bd0047c7$export$420e68273165f4ec({
    isDisabled: !within,
    onFocusWithinChange: onFocusChange
  });
  return {
    isFocused,
    isFocusVisible: isFocusVisibleState,
    focusProps: within ? focusWithinProps : focusProps
  };
}

// ../node_modules/@react-aria/focus/dist/FocusRing.mjs
import $hAmeg$react from "react";

// ../node_modules/@react-aria/focus/dist/useHasTabbableChild.mjs
import { useState as $hGAaG$useState } from "react";
function $83013635b024ae3d$export$eac1895992b9f3d6(ref, options) {
  let isDisabled = options?.isDisabled, [hasTabbableChild, setHasTabbableChild] = $hGAaG$useState(!1);
  return $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => {
    if (ref?.current && !isDisabled) {
      let update = () => {
        if (ref.current) {
          let walker = $9bf71ea28793e738$export$2d6ec8fc375ceafa(ref.current, {
            tabbable: !0
          });
          setHasTabbableChild(!!walker.nextNode());
        }
      };
      update();
      let observer = new MutationObserver(update);
      return observer.observe(ref.current, {
        subtree: !0,
        childList: !0,
        attributes: !0,
        attributeFilter: [
          "tabIndex",
          "disabled"
        ]
      }), () => {
        observer.disconnect();
      };
    }
  }), isDisabled ? !1 : hasTabbableChild;
}

// ../node_modules/@react-aria/focus/dist/virtualFocus.mjs
function $55f9b1ae81f22853$export$76e4e37e5339496d(to) {
  let from = $55f9b1ae81f22853$export$759df0d867455a91($431fbd86ca7dc216$export$b204af158042fbac(to));
  from !== to && (from && $55f9b1ae81f22853$export$6c5dc7e81d2cc29a(from, to), to && $55f9b1ae81f22853$export$2b35b76d2e30e129(to, from));
}
function $55f9b1ae81f22853$export$6c5dc7e81d2cc29a(from, to) {
  from.dispatchEvent(new FocusEvent("blur", {
    relatedTarget: to
  })), from.dispatchEvent(new FocusEvent("focusout", {
    bubbles: !0,
    relatedTarget: to
  }));
}
function $55f9b1ae81f22853$export$2b35b76d2e30e129(to, from) {
  to.dispatchEvent(new FocusEvent("focus", {
    relatedTarget: from
  })), to.dispatchEvent(new FocusEvent("focusin", {
    bubbles: !0,
    relatedTarget: from
  }));
}
function $55f9b1ae81f22853$export$759df0d867455a91(document3) {
  let activeElement = $d4ee10de306f2510$export$cd4e5573fbe2b576(document3), activeDescendant = activeElement?.getAttribute("aria-activedescendant");
  return activeDescendant && document3.getElementById(activeDescendant) || activeElement;
}

// ../node_modules/@react-aria/overlays/dist/useOverlay.mjs
import { useEffect as $jtpZv$useEffect } from "react";
var $a11501f3d1d39e6c$var$visibleOverlays = [];
function $a11501f3d1d39e6c$export$ea8f71083e90600f(props, ref) {
  let { onClose, shouldCloseOnBlur, isOpen, isDismissable = !1, isKeyboardDismissDisabled = !1, shouldCloseOnInteractOutside } = props;
  $jtpZv$useEffect(() => {
    if (isOpen && !$a11501f3d1d39e6c$var$visibleOverlays.includes(ref))
      return $a11501f3d1d39e6c$var$visibleOverlays.push(ref), () => {
        let index3 = $a11501f3d1d39e6c$var$visibleOverlays.indexOf(ref);
        index3 >= 0 && $a11501f3d1d39e6c$var$visibleOverlays.splice(index3, 1);
      };
  }, [
    isOpen,
    ref
  ]);
  let onHide = () => {
    $a11501f3d1d39e6c$var$visibleOverlays[$a11501f3d1d39e6c$var$visibleOverlays.length - 1] === ref && onClose && onClose();
  }, onInteractOutsideStart = (e) => {
    (!shouldCloseOnInteractOutside || shouldCloseOnInteractOutside(e.target)) && $a11501f3d1d39e6c$var$visibleOverlays[$a11501f3d1d39e6c$var$visibleOverlays.length - 1] === ref && (e.stopPropagation(), e.preventDefault());
  }, onInteractOutside = (e) => {
    (!shouldCloseOnInteractOutside || shouldCloseOnInteractOutside(e.target)) && ($a11501f3d1d39e6c$var$visibleOverlays[$a11501f3d1d39e6c$var$visibleOverlays.length - 1] === ref && (e.stopPropagation(), e.preventDefault()), onHide());
  }, onKeyDown = (e) => {
    e.key === "Escape" && !isKeyboardDismissDisabled && !e.nativeEvent.isComposing && (e.stopPropagation(), e.preventDefault(), onHide());
  };
  $e0b6e0b68ec7f50f$export$872b660ac5a1ff98({
    ref,
    onInteractOutside: isDismissable && isOpen ? onInteractOutside : void 0,
    onInteractOutsideStart
  });
  let { focusWithinProps } = $9ab94262bd0047c7$export$420e68273165f4ec({
    isDisabled: !shouldCloseOnBlur,
    onBlurWithin: (e) => {
      !e.relatedTarget || $9bf71ea28793e738$export$1258395f99bf9cbf(e.relatedTarget) || (!shouldCloseOnInteractOutside || shouldCloseOnInteractOutside(e.relatedTarget)) && onClose?.();
    }
  }), onPointerDownUnderlay = (e) => {
    e.target === e.currentTarget && e.preventDefault();
  };
  return {
    overlayProps: {
      onKeyDown,
      ...focusWithinProps
    },
    underlayProps: {
      onPointerDown: onPointerDownUnderlay
    }
  };
}

// ../node_modules/@react-aria/overlays/dist/useOverlayTrigger.mjs
import { useEffect as $gMvIk$useEffect } from "react";
function $628037886ba31236$export$f9d5c8beee7d008d(props, state, ref) {
  let { type } = props, { isOpen } = state;
  $gMvIk$useEffect(() => {
    ref && ref.current && $dd149f63282afbbf$export$f6211563215e3b37.set(ref.current, state.close);
  });
  let ariaHasPopup;
  type === "menu" ? ariaHasPopup = !0 : type === "listbox" && (ariaHasPopup = "listbox");
  let overlayId = $bdb11010cef70236$export$f680877a34711e37();
  return {
    triggerProps: {
      "aria-haspopup": ariaHasPopup,
      "aria-expanded": isOpen,
      "aria-controls": isOpen ? overlayId : void 0,
      onPress: state.toggle
    },
    overlayProps: {
      id: overlayId
    }
  };
}

// ../node_modules/@react-aria/overlays/dist/usePreventScroll.mjs
var $49c51c25361d4cd2$var$visualViewport = typeof document < "u" && window.visualViewport, $49c51c25361d4cd2$var$preventScrollCount = 0, $49c51c25361d4cd2$var$restore;
function $49c51c25361d4cd2$export$ee0f7cc6afcd1c18(options = {}) {
  let { isDisabled } = options;
  $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => {
    if (!isDisabled)
      return $49c51c25361d4cd2$var$preventScrollCount++, $49c51c25361d4cd2$var$preventScrollCount === 1 && ($c87311424ea30a05$export$fedb369cb70207f1() ? $49c51c25361d4cd2$var$restore = $49c51c25361d4cd2$var$preventScrollMobileSafari() : $49c51c25361d4cd2$var$restore = $49c51c25361d4cd2$var$preventScrollStandard()), () => {
        $49c51c25361d4cd2$var$preventScrollCount--, $49c51c25361d4cd2$var$preventScrollCount === 0 && $49c51c25361d4cd2$var$restore();
      };
  }, [
    isDisabled
  ]);
}
function $49c51c25361d4cd2$var$preventScrollStandard() {
  let scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  return $ff5963eb1fccf552$export$e08e3b67e392101e(scrollbarWidth > 0 && // Use scrollbar-gutter when supported because it also works for fixed positioned elements.
  ("scrollbarGutter" in document.documentElement.style ? $49c51c25361d4cd2$var$setStyle(document.documentElement, "scrollbarGutter", "stable") : $49c51c25361d4cd2$var$setStyle(document.documentElement, "paddingRight", `${scrollbarWidth}px`)), $49c51c25361d4cd2$var$setStyle(document.documentElement, "overflow", "hidden"));
}
function $49c51c25361d4cd2$var$preventScrollMobileSafari() {
  let scrollable, allowTouchMove = !1, onTouchStart = (e) => {
    let target = e.target;
    scrollable = $cc38e7bd3fc7b213$export$2bb74740c4e19def(target) ? target : $62d8ded9296f3872$export$cfa2225e87938781(target, !0), allowTouchMove = !1;
    let selection = target.ownerDocument.defaultView.getSelection();
    selection && !selection.isCollapsed && selection.containsNode(target, !0) && (allowTouchMove = !0), "selectionStart" in target && "selectionEnd" in target && target.selectionStart < target.selectionEnd && target.ownerDocument.activeElement === target && (allowTouchMove = !0);
  }, style = document.createElement("style");
  style.textContent = `
@layer {
  * {
    overscroll-behavior: contain;
  }
}`.trim(), document.head.prepend(style);
  let onTouchMove = (e) => {
    if (!(e.touches.length === 2 || allowTouchMove)) {
      if (!scrollable || scrollable === document.documentElement || scrollable === document.body) {
        e.preventDefault();
        return;
      }
      scrollable.scrollHeight === scrollable.clientHeight && scrollable.scrollWidth === scrollable.clientWidth && e.preventDefault();
    }
  }, onBlur = (e) => {
    let target = e.target, relatedTarget = e.relatedTarget;
    if (relatedTarget && $21f1aa98acb08317$export$c57958e35f31ed73(relatedTarget))
      relatedTarget.focus({
        preventScroll: !0
      }), $49c51c25361d4cd2$var$scrollIntoViewWhenReady(relatedTarget, $21f1aa98acb08317$export$c57958e35f31ed73(target));
    else if (!relatedTarget) {
      var _target_parentElement;
      let focusable = (_target_parentElement = target.parentElement) === null || _target_parentElement === void 0 ? void 0 : _target_parentElement.closest("[tabindex]");
      focusable?.focus({
        preventScroll: !0
      });
    }
  }, focus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function(opts) {
    let wasKeyboardVisible = document.activeElement != null && $21f1aa98acb08317$export$c57958e35f31ed73(document.activeElement);
    focus.call(this, {
      ...opts,
      preventScroll: !0
    }), (!opts || !opts.preventScroll) && $49c51c25361d4cd2$var$scrollIntoViewWhenReady(this, wasKeyboardVisible);
  };
  let removeEvents = $ff5963eb1fccf552$export$e08e3b67e392101e($49c51c25361d4cd2$var$addEvent(document, "touchstart", onTouchStart, {
    passive: !1,
    capture: !0
  }), $49c51c25361d4cd2$var$addEvent(document, "touchmove", onTouchMove, {
    passive: !1,
    capture: !0
  }), $49c51c25361d4cd2$var$addEvent(document, "blur", onBlur, !0));
  return () => {
    removeEvents(), style.remove(), HTMLElement.prototype.focus = focus;
  };
}
function $49c51c25361d4cd2$var$setStyle(element, style, value) {
  let cur = element.style[style];
  return element.style[style] = value, () => {
    element.style[style] = cur;
  };
}
function $49c51c25361d4cd2$var$addEvent(target, event, handler, options) {
  return target.addEventListener(event, handler, options), () => {
    target.removeEventListener(event, handler, options);
  };
}
function $49c51c25361d4cd2$var$scrollIntoViewWhenReady(target, wasKeyboardVisible) {
  wasKeyboardVisible || !$49c51c25361d4cd2$var$visualViewport ? $49c51c25361d4cd2$var$scrollIntoView(target) : $49c51c25361d4cd2$var$visualViewport.addEventListener("resize", () => $49c51c25361d4cd2$var$scrollIntoView(target), {
    once: !0
  });
}
function $49c51c25361d4cd2$var$scrollIntoView(target) {
  let root = document.scrollingElement || document.documentElement, nextTarget = target;
  for (; nextTarget && nextTarget !== root; ) {
    let scrollable = $62d8ded9296f3872$export$cfa2225e87938781(nextTarget);
    if (scrollable !== document.documentElement && scrollable !== document.body && scrollable !== nextTarget) {
      let scrollableRect = scrollable.getBoundingClientRect(), targetRect = nextTarget.getBoundingClientRect();
      if (targetRect.top < scrollableRect.top || targetRect.bottom > scrollableRect.top + nextTarget.clientHeight) {
        let bottom = scrollableRect.bottom;
        $49c51c25361d4cd2$var$visualViewport && (bottom = Math.min(bottom, $49c51c25361d4cd2$var$visualViewport.offsetTop + $49c51c25361d4cd2$var$visualViewport.height));
        let adjustment = targetRect.top - scrollableRect.top - ((bottom - scrollableRect.top) / 2 - targetRect.height / 2);
        scrollable.scrollTo({
          // Clamp to the valid range to prevent over-scrolling.
          top: Math.max(0, Math.min(scrollable.scrollHeight - scrollable.clientHeight, scrollable.scrollTop + adjustment)),
          behavior: "smooth"
        });
      }
    }
    nextTarget = scrollable.parentElement;
  }
}

// ../node_modules/@react-aria/overlays/dist/PortalProvider.mjs
import $7yuSY$react, { createContext as $7yuSY$createContext, useContext as $7yuSY$useContext } from "react";
var $96b38030c423d352$export$60d741e20e0aa309 = $7yuSY$createContext({});
function $96b38030c423d352$export$78efe591171d7d45(props) {
  let { getContainer } = props, { getContainer: ctxGetContainer } = $96b38030c423d352$export$9fc1347d4195ccb3();
  return $7yuSY$react.createElement($96b38030c423d352$export$60d741e20e0aa309.Provider, {
    value: {
      getContainer: getContainer === null ? void 0 : getContainer ?? ctxGetContainer
    }
  }, props.children);
}
function $96b38030c423d352$export$9fc1347d4195ccb3() {
  var _useContext;
  return (_useContext = $7yuSY$useContext($96b38030c423d352$export$60d741e20e0aa309)) !== null && _useContext !== void 0 ? _useContext : {};
}

// ../node_modules/@react-aria/overlays/dist/useModal.mjs
import $4AOtR$react, { useContext as $4AOtR$useContext, useState as $4AOtR$useState, useMemo as $4AOtR$useMemo, useEffect as $4AOtR$useEffect } from "react";
import $4AOtR$reactdom from "react-dom";
var $f57aed4a881a3485$var$Context = $4AOtR$react.createContext(null);
function $f57aed4a881a3485$export$178405afcd8c5eb(props) {
  let { children } = props, parent = $4AOtR$useContext($f57aed4a881a3485$var$Context), [modalCount, setModalCount] = $4AOtR$useState(0), context = $4AOtR$useMemo(() => ({
    parent,
    modalCount,
    addModal() {
      setModalCount((count) => count + 1), parent && parent.addModal();
    },
    removeModal() {
      setModalCount((count) => count - 1), parent && parent.removeModal();
    }
  }), [
    parent,
    modalCount
  ]);
  return $4AOtR$react.createElement($f57aed4a881a3485$var$Context.Provider, {
    value: context
  }, children);
}
function $f57aed4a881a3485$export$d9aaed4c3ece1bc0() {
  let context = $4AOtR$useContext($f57aed4a881a3485$var$Context);
  return {
    modalProviderProps: {
      "aria-hidden": context && context.modalCount > 0 ? !0 : void 0
    }
  };
}
function $f57aed4a881a3485$var$OverlayContainerDOM(props) {
  let { modalProviderProps } = $f57aed4a881a3485$export$d9aaed4c3ece1bc0();
  return $4AOtR$react.createElement("div", {
    "data-overlay-container": !0,
    ...props,
    ...modalProviderProps
  });
}
function $f57aed4a881a3485$export$bf688221f59024e5(props) {
  return $4AOtR$react.createElement($f57aed4a881a3485$export$178405afcd8c5eb, null, $4AOtR$react.createElement($f57aed4a881a3485$var$OverlayContainerDOM, props));
}
function $f57aed4a881a3485$export$b47c3594eab58386(props) {
  let isSSR = $b5e257d569688ac6$export$535bd6ca7f90a273(), { portalContainer = isSSR ? null : document.body, ...rest } = props, { getContainer } = $96b38030c423d352$export$9fc1347d4195ccb3();
  if (!props.portalContainer && getContainer && (portalContainer = getContainer()), $4AOtR$react.useEffect(() => {
    if (portalContainer?.closest("[data-overlay-container]")) throw new Error("An OverlayContainer must not be inside another container. Please change the portalContainer prop.");
  }, [
    portalContainer
  ]), !portalContainer) return null;
  let contents = $4AOtR$react.createElement($f57aed4a881a3485$export$bf688221f59024e5, rest);
  return $4AOtR$reactdom.createPortal(contents, portalContainer);
}

// ../node_modules/@react-aria/overlays/dist/ar-AE.mjs
var $773d5888b972f1cf$exports = {};
$773d5888b972f1cf$exports = {
  dismiss: "\u062A\u062C\u0627\u0647\u0644"
};

// ../node_modules/@react-aria/overlays/dist/bg-BG.mjs
var $d11f19852b941573$exports = {};
$d11f19852b941573$exports = {
  dismiss: "\u041E\u0442\u0445\u0432\u044A\u0440\u043B\u044F\u043D\u0435"
};

// ../node_modules/@react-aria/overlays/dist/cs-CZ.mjs
var $b983974c2ee1efb3$exports = {};
$b983974c2ee1efb3$exports = {
  dismiss: "Odstranit"
};

// ../node_modules/@react-aria/overlays/dist/da-DK.mjs
var $5809cc9d4e92de73$exports = {};
$5809cc9d4e92de73$exports = {
  dismiss: "Luk"
};

// ../node_modules/@react-aria/overlays/dist/de-DE.mjs
var $c68c2e4fc74398d1$exports = {};
$c68c2e4fc74398d1$exports = {
  dismiss: "Schlie\xDFen"
};

// ../node_modules/@react-aria/overlays/dist/el-GR.mjs
var $0898b4c153db2b77$exports = {};
$0898b4c153db2b77$exports = {
  dismiss: "\u0391\u03C0\u03CC\u03C1\u03C1\u03B9\u03C8\u03B7"
};

// ../node_modules/@react-aria/overlays/dist/en-US.mjs
var $6d74810286a15183$exports = {};
$6d74810286a15183$exports = {
  dismiss: "Dismiss"
};

// ../node_modules/@react-aria/overlays/dist/es-ES.mjs
var $309d73dc65f78055$exports = {};
$309d73dc65f78055$exports = {
  dismiss: "Descartar"
};

// ../node_modules/@react-aria/overlays/dist/et-EE.mjs
var $44ad94f7205cf593$exports = {};
$44ad94f7205cf593$exports = {
  dismiss: "L\xF5peta"
};

// ../node_modules/@react-aria/overlays/dist/fi-FI.mjs
var $7c28f5687f0779a9$exports = {};
$7c28f5687f0779a9$exports = {
  dismiss: "Hylk\xE4\xE4"
};

// ../node_modules/@react-aria/overlays/dist/fr-FR.mjs
var $e6d75df4b68bd73a$exports = {};
$e6d75df4b68bd73a$exports = {
  dismiss: "Rejeter"
};

// ../node_modules/@react-aria/overlays/dist/he-IL.mjs
var $87505c9dab186d0f$exports = {};
$87505c9dab186d0f$exports = {
  dismiss: "\u05D4\u05EA\u05E2\u05DC\u05DD"
};

// ../node_modules/@react-aria/overlays/dist/hr-HR.mjs
var $553439c3ffb3e492$exports = {};
$553439c3ffb3e492$exports = {
  dismiss: "Odbaci"
};

// ../node_modules/@react-aria/overlays/dist/hu-HU.mjs
var $74cf411061b983a2$exports = {};
$74cf411061b983a2$exports = {
  dismiss: "Elutas\xEDt\xE1s"
};

// ../node_modules/@react-aria/overlays/dist/it-IT.mjs
var $e933f298574dc435$exports = {};
$e933f298574dc435$exports = {
  dismiss: "Ignora"
};

// ../node_modules/@react-aria/overlays/dist/ja-JP.mjs
var $ac91fc9fe02f71f6$exports = {};
$ac91fc9fe02f71f6$exports = {
  dismiss: "\u9589\u3058\u308B"
};

// ../node_modules/@react-aria/overlays/dist/ko-KR.mjs
var $52b96f86422025af$exports = {};
$52b96f86422025af$exports = {
  dismiss: "\uBB34\uC2DC"
};

// ../node_modules/@react-aria/overlays/dist/lt-LT.mjs
var $c0d724c3e51dafa6$exports = {};
$c0d724c3e51dafa6$exports = {
  dismiss: "Atmesti"
};

// ../node_modules/@react-aria/overlays/dist/lv-LV.mjs
var $c92899672a3fe72e$exports = {};
$c92899672a3fe72e$exports = {
  dismiss: "Ner\u0101d\u012Bt"
};

// ../node_modules/@react-aria/overlays/dist/nb-NO.mjs
var $9f576b39d8e7a9d6$exports = {};
$9f576b39d8e7a9d6$exports = {
  dismiss: "Lukk"
};

// ../node_modules/@react-aria/overlays/dist/nl-NL.mjs
var $9d025808aeec81a7$exports = {};
$9d025808aeec81a7$exports = {
  dismiss: "Negeren"
};

// ../node_modules/@react-aria/overlays/dist/pl-PL.mjs
var $fce709921e2c0fa6$exports = {};
$fce709921e2c0fa6$exports = {
  dismiss: "Zignoruj"
};

// ../node_modules/@react-aria/overlays/dist/pt-BR.mjs
var $2599cf0c4ab37f59$exports = {};
$2599cf0c4ab37f59$exports = {
  dismiss: "Descartar"
};

// ../node_modules/@react-aria/overlays/dist/pt-PT.mjs
var $3c220ae7ef8a35fd$exports = {};
$3c220ae7ef8a35fd$exports = {
  dismiss: "Dispensar"
};

// ../node_modules/@react-aria/overlays/dist/ro-RO.mjs
var $93562b5094072f54$exports = {};
$93562b5094072f54$exports = {
  dismiss: "Revocare"
};

// ../node_modules/@react-aria/overlays/dist/ru-RU.mjs
var $cd9e2abd0d06c7b4$exports = {};
$cd9e2abd0d06c7b4$exports = {
  dismiss: "\u041F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C"
};

// ../node_modules/@react-aria/overlays/dist/sk-SK.mjs
var $45375701f409adf1$exports = {};
$45375701f409adf1$exports = {
  dismiss: "Zru\u0161i\u0165"
};

// ../node_modules/@react-aria/overlays/dist/sl-SI.mjs
var $27fab53a576de9dd$exports = {};
$27fab53a576de9dd$exports = {
  dismiss: "Opusti"
};

// ../node_modules/@react-aria/overlays/dist/sr-SP.mjs
var $4438748d9952e7c7$exports = {};
$4438748d9952e7c7$exports = {
  dismiss: "Odbaci"
};

// ../node_modules/@react-aria/overlays/dist/sv-SE.mjs
var $0936d7347ef4da4c$exports = {};
$0936d7347ef4da4c$exports = {
  dismiss: "Avvisa"
};

// ../node_modules/@react-aria/overlays/dist/tr-TR.mjs
var $29700c92185d38f8$exports = {};
$29700c92185d38f8$exports = {
  dismiss: "Kapat"
};

// ../node_modules/@react-aria/overlays/dist/uk-UA.mjs
var $662ccaf2be4c25b3$exports = {};
$662ccaf2be4c25b3$exports = {
  dismiss: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438"
};

// ../node_modules/@react-aria/overlays/dist/zh-CN.mjs
var $d80a27deda7cdb3c$exports = {};
$d80a27deda7cdb3c$exports = {
  dismiss: "\u53D6\u6D88"
};

// ../node_modules/@react-aria/overlays/dist/zh-TW.mjs
var $2b2734393847c884$exports = {};
$2b2734393847c884$exports = {
  dismiss: "\u95DC\u9589"
};

// ../node_modules/@react-aria/overlays/dist/intlStrings.mjs
var $a2f21f5f14f60553$exports = {};
$a2f21f5f14f60553$exports = {
  "ar-AE": $773d5888b972f1cf$exports,
  "bg-BG": $d11f19852b941573$exports,
  "cs-CZ": $b983974c2ee1efb3$exports,
  "da-DK": $5809cc9d4e92de73$exports,
  "de-DE": $c68c2e4fc74398d1$exports,
  "el-GR": $0898b4c153db2b77$exports,
  "en-US": $6d74810286a15183$exports,
  "es-ES": $309d73dc65f78055$exports,
  "et-EE": $44ad94f7205cf593$exports,
  "fi-FI": $7c28f5687f0779a9$exports,
  "fr-FR": $e6d75df4b68bd73a$exports,
  "he-IL": $87505c9dab186d0f$exports,
  "hr-HR": $553439c3ffb3e492$exports,
  "hu-HU": $74cf411061b983a2$exports,
  "it-IT": $e933f298574dc435$exports,
  "ja-JP": $ac91fc9fe02f71f6$exports,
  "ko-KR": $52b96f86422025af$exports,
  "lt-LT": $c0d724c3e51dafa6$exports,
  "lv-LV": $c92899672a3fe72e$exports,
  "nb-NO": $9f576b39d8e7a9d6$exports,
  "nl-NL": $9d025808aeec81a7$exports,
  "pl-PL": $fce709921e2c0fa6$exports,
  "pt-BR": $2599cf0c4ab37f59$exports,
  "pt-PT": $3c220ae7ef8a35fd$exports,
  "ro-RO": $93562b5094072f54$exports,
  "ru-RU": $cd9e2abd0d06c7b4$exports,
  "sk-SK": $45375701f409adf1$exports,
  "sl-SI": $27fab53a576de9dd$exports,
  "sr-SP": $4438748d9952e7c7$exports,
  "sv-SE": $0936d7347ef4da4c$exports,
  "tr-TR": $29700c92185d38f8$exports,
  "uk-UA": $662ccaf2be4c25b3$exports,
  "zh-CN": $d80a27deda7cdb3c$exports,
  "zh-TW": $2b2734393847c884$exports
};

// ../node_modules/@react-aria/overlays/dist/DismissButton.mjs
import $iYaQO$react from "react";

// ../node_modules/@react-aria/visually-hidden/dist/VisuallyHidden.mjs
import $7JYt2$react, { useState as $7JYt2$useState, useMemo as $7JYt2$useMemo } from "react";
var $5c3e21d68f1c4674$var$styles = {
  border: 0,
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  width: "1px",
  whiteSpace: "nowrap"
};
function $5c3e21d68f1c4674$export$a966af930f325cab(props = {}) {
  let { style, isFocusable } = props, [isFocused, setFocused] = $7JYt2$useState(!1), { focusWithinProps } = $9ab94262bd0047c7$export$420e68273165f4ec({
    isDisabled: !isFocusable,
    onFocusWithinChange: (val) => setFocused(val)
  }), combinedStyles = $7JYt2$useMemo(() => isFocused ? style : style ? {
    ...$5c3e21d68f1c4674$var$styles,
    ...style
  } : $5c3e21d68f1c4674$var$styles, [
    isFocused
  ]);
  return {
    visuallyHiddenProps: {
      ...focusWithinProps,
      style: combinedStyles
    }
  };
}
function $5c3e21d68f1c4674$export$439d29a4e110a164(props) {
  let { children, elementType: Element2 = "div", isFocusable, style, ...otherProps } = props, { visuallyHiddenProps } = $5c3e21d68f1c4674$export$a966af930f325cab(props);
  return $7JYt2$react.createElement(Element2, $3ef42575df84b30b$export$9d1611c77c2fe928(otherProps, visuallyHiddenProps), children);
}

// ../node_modules/@react-aria/overlays/dist/DismissButton.mjs
function $parcel$interopDefault(a) {
  return a && a.__esModule ? a.default : a;
}
function $86ea4cb521eb2e37$export$2317d149ed6f78c4(props) {
  let { onDismiss, ...otherProps } = props, stringFormatter = $fca6afa0e843324b$export$f12b703ca79dfbb1($parcel$interopDefault($a2f21f5f14f60553$exports), "@react-aria/overlays"), labels = $313b98861ee5dd6c$export$d6875122194c7b44(otherProps, stringFormatter.format("dismiss")), onClick = () => {
    onDismiss && onDismiss();
  };
  return $iYaQO$react.createElement($5c3e21d68f1c4674$export$439d29a4e110a164, null, $iYaQO$react.createElement("button", {
    ...labels,
    tabIndex: -1,
    onClick,
    style: {
      width: 1,
      height: 1
    }
  }));
}

// ../node_modules/@react-aria/overlays/dist/ariaHideOutside.mjs
var $5e3802645cc19319$var$supportsInert = typeof HTMLElement < "u" && "inert" in HTMLElement.prototype, $5e3802645cc19319$var$refCountMap = /* @__PURE__ */ new WeakMap(), $5e3802645cc19319$var$observerStack = [];
function $5e3802645cc19319$export$1c3ebcada18427bf(targets, options) {
  let windowObj = $431fbd86ca7dc216$export$f21a1ffae260145a(targets?.[0]), opts = options instanceof windowObj.Element ? {
    root: options
  } : options;
  var _opts_root;
  let root = (_opts_root = opts?.root) !== null && _opts_root !== void 0 ? _opts_root : document.body, shouldUseInert = opts?.shouldUseInert && $5e3802645cc19319$var$supportsInert, visibleNodes = new Set(targets), hiddenNodes = /* @__PURE__ */ new Set(), getHidden = (element) => shouldUseInert && element instanceof windowObj.HTMLElement ? element.inert : element.getAttribute("aria-hidden") === "true", setHidden = (element, hidden) => {
    shouldUseInert && element instanceof windowObj.HTMLElement ? element.inert = hidden : hidden ? element.setAttribute("aria-hidden", "true") : (element.removeAttribute("aria-hidden"), element instanceof windowObj.HTMLElement && (element.inert = !1));
  }, walk = (root2) => {
    for (let element of root2.querySelectorAll("[data-live-announcer], [data-react-aria-top-layer]")) visibleNodes.add(element);
    let acceptNode = (node) => {
      if (hiddenNodes.has(node) || visibleNodes.has(node) || node.parentElement && hiddenNodes.has(node.parentElement) && node.parentElement.getAttribute("role") !== "row") return NodeFilter.FILTER_REJECT;
      for (let target of visibleNodes)
        if (node.contains(target)) return NodeFilter.FILTER_SKIP;
      return NodeFilter.FILTER_ACCEPT;
    }, walker = document.createTreeWalker(root2, NodeFilter.SHOW_ELEMENT, {
      acceptNode
    }), acceptRoot = acceptNode(root2);
    if (acceptRoot === NodeFilter.FILTER_ACCEPT && hide(root2), acceptRoot !== NodeFilter.FILTER_REJECT) {
      let node = walker.nextNode();
      for (; node != null; )
        hide(node), node = walker.nextNode();
    }
  }, hide = (node) => {
    var _refCountMap_get;
    let refCount = (_refCountMap_get = $5e3802645cc19319$var$refCountMap.get(node)) !== null && _refCountMap_get !== void 0 ? _refCountMap_get : 0;
    getHidden(node) && refCount === 0 || (refCount === 0 && setHidden(node, !0), hiddenNodes.add(node), $5e3802645cc19319$var$refCountMap.set(node, refCount + 1));
  };
  $5e3802645cc19319$var$observerStack.length && $5e3802645cc19319$var$observerStack[$5e3802645cc19319$var$observerStack.length - 1].disconnect(), walk(root);
  let observer = new MutationObserver((changes) => {
    for (let change of changes)
      if (change.type === "childList" && ![
        ...visibleNodes,
        ...hiddenNodes
      ].some((node) => node.contains(change.target)))
        for (let node of change.addedNodes)
          (node instanceof HTMLElement || node instanceof SVGElement) && (node.dataset.liveAnnouncer === "true" || node.dataset.reactAriaTopLayer === "true") ? visibleNodes.add(node) : node instanceof Element && walk(node);
  });
  observer.observe(root, {
    childList: !0,
    subtree: !0
  });
  let observerWrapper = {
    visibleNodes,
    hiddenNodes,
    observe() {
      observer.observe(root, {
        childList: !0,
        subtree: !0
      });
    },
    disconnect() {
      observer.disconnect();
    }
  };
  return $5e3802645cc19319$var$observerStack.push(observerWrapper), () => {
    observer.disconnect();
    for (let node of hiddenNodes) {
      let count = $5e3802645cc19319$var$refCountMap.get(node);
      count != null && (count === 1 ? (setHidden(node, !1), $5e3802645cc19319$var$refCountMap.delete(node)) : $5e3802645cc19319$var$refCountMap.set(node, count - 1));
    }
    observerWrapper === $5e3802645cc19319$var$observerStack[$5e3802645cc19319$var$observerStack.length - 1] ? ($5e3802645cc19319$var$observerStack.pop(), $5e3802645cc19319$var$observerStack.length && $5e3802645cc19319$var$observerStack[$5e3802645cc19319$var$observerStack.length - 1].observe()) : $5e3802645cc19319$var$observerStack.splice($5e3802645cc19319$var$observerStack.indexOf(observerWrapper), 1);
  };
}
function $5e3802645cc19319$export$1020fa7f77e17884(element) {
  let observer = $5e3802645cc19319$var$observerStack[$5e3802645cc19319$var$observerStack.length - 1];
  if (observer && !observer.visibleNodes.has(element))
    return observer.visibleNodes.add(element), () => {
      observer.visibleNodes.delete(element);
    };
}

// ../node_modules/@react-aria/overlays/dist/usePopover.mjs
import { useEffect as $m0yab$useEffect } from "react";
function $f2f8a6077418541e$export$542a6fd13ac93354(props, state) {
  let { triggerRef, popoverRef, groupRef, isNonModal, isKeyboardDismissDisabled, shouldCloseOnInteractOutside, ...otherProps } = props, isSubmenu = otherProps.trigger === "SubmenuTrigger", { overlayProps, underlayProps } = $a11501f3d1d39e6c$export$ea8f71083e90600f({
    isOpen: state.isOpen,
    onClose: state.close,
    shouldCloseOnBlur: !0,
    isDismissable: !isNonModal || isSubmenu,
    isKeyboardDismissDisabled,
    shouldCloseOnInteractOutside
  }, groupRef ?? popoverRef), { overlayProps: positionProps, arrowProps, placement, triggerAnchorPoint: origin } = $2a41e45df1593e64$export$d39e1813b3bdd0e1({
    ...otherProps,
    targetRef: triggerRef,
    overlayRef: popoverRef,
    isOpen: state.isOpen,
    onClose: isNonModal && !isSubmenu ? state.close : null
  });
  return $49c51c25361d4cd2$export$ee0f7cc6afcd1c18({
    isDisabled: isNonModal || !state.isOpen
  }), $m0yab$useEffect(() => {
    if (state.isOpen && popoverRef.current) {
      var _groupRef_current, _groupRef_current1;
      return isNonModal ? $5e3802645cc19319$export$1020fa7f77e17884((_groupRef_current = groupRef?.current) !== null && _groupRef_current !== void 0 ? _groupRef_current : popoverRef.current) : $5e3802645cc19319$export$1c3ebcada18427bf([
        (_groupRef_current1 = groupRef?.current) !== null && _groupRef_current1 !== void 0 ? _groupRef_current1 : popoverRef.current
      ], {
        shouldUseInert: !0
      });
    }
  }, [
    isNonModal,
    state.isOpen,
    popoverRef,
    groupRef
  ]), {
    popoverProps: $3ef42575df84b30b$export$9d1611c77c2fe928(overlayProps, positionProps),
    arrowProps,
    underlayProps,
    placement,
    triggerAnchorPoint: origin
  };
}

// ../node_modules/@react-aria/overlays/dist/Overlay.mjs
import $1CM7W$react, { useState as $1CM7W$useState, useMemo as $1CM7W$useMemo, useContext as $1CM7W$useContext } from "react";
import $1CM7W$reactdom from "react-dom";
var $337b884510726a0d$export$a2200b96afd16271 = $1CM7W$react.createContext(null);
function $337b884510726a0d$export$c6fdb837b070b4ff(props) {
  let isSSR = $b5e257d569688ac6$export$535bd6ca7f90a273(), { portalContainer = isSSR ? null : document.body, isExiting } = props, [contain, setContain] = $1CM7W$useState(!1), contextValue = $1CM7W$useMemo(() => ({
    contain,
    setContain
  }), [
    contain,
    setContain
  ]), { getContainer } = $96b38030c423d352$export$9fc1347d4195ccb3();
  if (!props.portalContainer && getContainer && (portalContainer = getContainer()), !portalContainer) return null;
  let contents = props.children;
  return props.disableFocusManagement || (contents = $1CM7W$react.createElement($9bf71ea28793e738$export$20e40289641fbbb6, {
    restoreFocus: !0,
    contain: (props.shouldContainFocus || contain) && !isExiting
  }, contents)), contents = $1CM7W$react.createElement($337b884510726a0d$export$a2200b96afd16271.Provider, {
    value: contextValue
  }, $1CM7W$react.createElement($f1ab8c75478c6f73$export$cf75428e0b9ed1ea, null, contents)), $1CM7W$reactdom.createPortal(contents, portalContainer);
}
function $337b884510726a0d$export$14c98a7594375490() {
  let ctx = $1CM7W$useContext($337b884510726a0d$export$a2200b96afd16271), setContain = ctx?.setContain;
  $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => {
    setContain?.(!0);
  }, [
    setContain
  ]);
}

// ../node_modules/@react-aria/overlays/dist/useModalOverlay.mjs
import { useEffect as $7Dhkr$useEffect } from "react";
function $8ac8429251c45e4b$export$dbc0f175b25fb0fb(props, state, ref) {
  let { overlayProps, underlayProps } = $a11501f3d1d39e6c$export$ea8f71083e90600f({
    ...props,
    isOpen: state.isOpen,
    onClose: state.close
  }, ref);
  return $49c51c25361d4cd2$export$ee0f7cc6afcd1c18({
    isDisabled: !state.isOpen
  }), $337b884510726a0d$export$14c98a7594375490(), $7Dhkr$useEffect(() => {
    if (state.isOpen && ref.current) return $5e3802645cc19319$export$1c3ebcada18427bf([
      ref.current
    ], {
      shouldUseInert: !0
    });
  }, [
    state.isOpen,
    ref
  ]), {
    modalProps: $3ef42575df84b30b$export$9d1611c77c2fe928(overlayProps),
    underlayProps
  };
}

// ../node_modules/@react-stately/tooltip/dist/useTooltipTriggerState.mjs
import { useMemo as $50cCT$useMemo, useRef as $50cCT$useRef, useEffect as $50cCT$useEffect } from "react";

// ../node_modules/@react-stately/overlays/dist/useOverlayTriggerState.mjs
import { useCallback as $hnMvi$useCallback } from "react";
function $fc909762b330b746$export$61c6a8c84e605fb6(props) {
  let [isOpen, setOpen] = $458b0a5536c1a7cf$export$40bfa8c7b0832715(props.isOpen, props.defaultOpen || !1, props.onOpenChange), open = $hnMvi$useCallback(() => {
    setOpen(!0);
  }, [
    setOpen
  ]), close = $hnMvi$useCallback(() => {
    setOpen(!1);
  }, [
    setOpen
  ]), toggle = $hnMvi$useCallback(() => {
    setOpen(!isOpen);
  }, [
    setOpen,
    isOpen
  ]);
  return {
    isOpen,
    setOpen,
    open,
    close,
    toggle
  };
}

// ../node_modules/@react-stately/tooltip/dist/useTooltipTriggerState.mjs
var $8796f90736e175cb$var$TOOLTIP_DELAY = 1500, $8796f90736e175cb$var$TOOLTIP_COOLDOWN = 500, $8796f90736e175cb$var$tooltips = {}, $8796f90736e175cb$var$tooltipId = 0, $8796f90736e175cb$var$globalWarmedUp = !1, $8796f90736e175cb$var$globalWarmUpTimeout = null, $8796f90736e175cb$var$globalCooldownTimeout = null;
function $8796f90736e175cb$export$4d40659c25ecb50b(props = {}) {
  let { delay = $8796f90736e175cb$var$TOOLTIP_DELAY, closeDelay = $8796f90736e175cb$var$TOOLTIP_COOLDOWN } = props, { isOpen, open, close } = $fc909762b330b746$export$61c6a8c84e605fb6(props), id = $50cCT$useMemo(() => `${++$8796f90736e175cb$var$tooltipId}`, []), closeTimeout = $50cCT$useRef(null), closeCallback = $50cCT$useRef(close), ensureTooltipEntry = () => {
    $8796f90736e175cb$var$tooltips[id] = hideTooltip;
  }, closeOpenTooltips = () => {
    for (let hideTooltipId in $8796f90736e175cb$var$tooltips) hideTooltipId !== id && ($8796f90736e175cb$var$tooltips[hideTooltipId](!0), delete $8796f90736e175cb$var$tooltips[hideTooltipId]);
  }, showTooltip = () => {
    closeTimeout.current && clearTimeout(closeTimeout.current), closeTimeout.current = null, closeOpenTooltips(), ensureTooltipEntry(), $8796f90736e175cb$var$globalWarmedUp = !0, open(), $8796f90736e175cb$var$globalWarmUpTimeout && (clearTimeout($8796f90736e175cb$var$globalWarmUpTimeout), $8796f90736e175cb$var$globalWarmUpTimeout = null), $8796f90736e175cb$var$globalCooldownTimeout && (clearTimeout($8796f90736e175cb$var$globalCooldownTimeout), $8796f90736e175cb$var$globalCooldownTimeout = null);
  }, hideTooltip = (immediate) => {
    immediate || closeDelay <= 0 ? (closeTimeout.current && clearTimeout(closeTimeout.current), closeTimeout.current = null, closeCallback.current()) : closeTimeout.current || (closeTimeout.current = setTimeout(() => {
      closeTimeout.current = null, closeCallback.current();
    }, closeDelay)), $8796f90736e175cb$var$globalWarmUpTimeout && (clearTimeout($8796f90736e175cb$var$globalWarmUpTimeout), $8796f90736e175cb$var$globalWarmUpTimeout = null), $8796f90736e175cb$var$globalWarmedUp && ($8796f90736e175cb$var$globalCooldownTimeout && clearTimeout($8796f90736e175cb$var$globalCooldownTimeout), $8796f90736e175cb$var$globalCooldownTimeout = setTimeout(() => {
      delete $8796f90736e175cb$var$tooltips[id], $8796f90736e175cb$var$globalCooldownTimeout = null, $8796f90736e175cb$var$globalWarmedUp = !1;
    }, Math.max($8796f90736e175cb$var$TOOLTIP_COOLDOWN, closeDelay)));
  }, warmupTooltip = () => {
    closeOpenTooltips(), ensureTooltipEntry(), !isOpen && !$8796f90736e175cb$var$globalWarmUpTimeout && !$8796f90736e175cb$var$globalWarmedUp ? $8796f90736e175cb$var$globalWarmUpTimeout = setTimeout(() => {
      $8796f90736e175cb$var$globalWarmUpTimeout = null, $8796f90736e175cb$var$globalWarmedUp = !0, showTooltip();
    }, delay) : isOpen || showTooltip();
  };
  return $50cCT$useEffect(() => {
    closeCallback.current = close;
  }, [
    close
  ]), $50cCT$useEffect(() => () => {
    closeTimeout.current && clearTimeout(closeTimeout.current), $8796f90736e175cb$var$tooltips[id] && delete $8796f90736e175cb$var$tooltips[id];
  }, [
    id
  ]), {
    isOpen,
    open: (immediate) => {
      !immediate && delay > 0 && !closeTimeout.current ? warmupTooltip() : showTooltip();
    },
    close: hideTooltip
  };
}

// ../node_modules/react-aria-components/dist/Tooltip.mjs
import $cCslV$react, { createContext as $cCslV$createContext, useRef as $cCslV$useRef, forwardRef as $cCslV$forwardRef, useContext as $cCslV$useContext } from "react";
var $4e3b923658d69c60$export$7a7623236eec67fa = $cCslV$createContext(null), $4e3b923658d69c60$export$39ae08fa83328b12 = $cCslV$createContext(null);
function $4e3b923658d69c60$export$8c610744efcf8a1d(props) {
  let state = $8796f90736e175cb$export$4d40659c25ecb50b(props), ref = $cCslV$useRef(null), { triggerProps, tooltipProps } = $4e1b34546679e357$export$a6da6c504e4bba8b(props, state, ref);
  return $cCslV$react.createElement($64fa3d84918910a7$export$2881499e37b75b9a, {
    values: [
      [
        $4e3b923658d69c60$export$7a7623236eec67fa,
        state
      ],
      [
        $4e3b923658d69c60$export$39ae08fa83328b12,
        {
          ...tooltipProps,
          triggerRef: ref
        }
      ]
    ]
  }, $cCslV$react.createElement($f645667febf57a63$export$13f3202a3e5ddd5, {
    ...triggerProps,
    ref
  }, props.children));
}
var $4e3b923658d69c60$export$28c660c63b792dea = $cCslV$forwardRef(function({ UNSTABLE_portalContainer, ...props }, ref) {
  [props, ref] = $64fa3d84918910a7$export$29f1550f4b0d4415(props, ref, $4e3b923658d69c60$export$39ae08fa83328b12);
  let contextState = $cCslV$useContext($4e3b923658d69c60$export$7a7623236eec67fa), localState = $8796f90736e175cb$export$4d40659c25ecb50b(props), state = props.isOpen != null || props.defaultOpen != null || !contextState ? localState : contextState, isExiting = $d3f049242431219c$export$45fda7c47f93fd48(ref, state.isOpen) || props.isExiting || !1;
  return !state.isOpen && !isExiting ? null : $cCslV$react.createElement($f57aed4a881a3485$export$b47c3594eab58386, {
    portalContainer: UNSTABLE_portalContainer
  }, $cCslV$react.createElement($4e3b923658d69c60$var$TooltipInner, {
    ...props,
    tooltipRef: ref,
    isExiting
  }));
});
function $4e3b923658d69c60$var$TooltipInner(props) {
  let state = $cCslV$useContext($4e3b923658d69c60$export$7a7623236eec67fa), arrowRef = $cCslV$useRef(null), { overlayProps, arrowProps, placement, triggerAnchorPoint } = $2a41e45df1593e64$export$d39e1813b3bdd0e1({
    placement: props.placement || "top",
    targetRef: props.triggerRef,
    overlayRef: props.tooltipRef,
    arrowRef,
    offset: props.offset,
    crossOffset: props.crossOffset,
    isOpen: state.isOpen,
    arrowBoundaryOffset: props.arrowBoundaryOffset,
    shouldFlip: props.shouldFlip,
    containerPadding: props.containerPadding,
    onClose: () => state.close(!0)
  }), isEntering = $d3f049242431219c$export$6d3443f2c48bfc20(props.tooltipRef, !!placement) || props.isEntering || !1, renderProps = $64fa3d84918910a7$export$4d86445c2cf5e3({
    ...props,
    defaultClassName: "react-aria-Tooltip",
    values: {
      placement,
      isEntering,
      isExiting: props.isExiting,
      state
    }
  });
  props = $3ef42575df84b30b$export$9d1611c77c2fe928(props, overlayProps);
  let { tooltipProps } = $326e436e94273fe1$export$1c4b08e0eca38426(props, state), DOMProps = $65484d02dcb7eb3e$export$457c3d6518dd4c6f(props, {
    global: !0
  });
  return $cCslV$react.createElement("div", {
    ...$3ef42575df84b30b$export$9d1611c77c2fe928(DOMProps, renderProps, tooltipProps),
    ref: props.tooltipRef,
    style: {
      ...overlayProps.style,
      "--trigger-anchor-point": triggerAnchorPoint ? `${triggerAnchorPoint.x}px ${triggerAnchorPoint.y}px` : void 0,
      ...renderProps.style
    },
    "data-placement": placement ?? void 0,
    "data-entering": isEntering || void 0,
    "data-exiting": props.isExiting || void 0
  }, $cCslV$react.createElement($44f671af83e7d9e0$export$2de4954e8ae13b9f.Provider, {
    value: {
      ...arrowProps,
      placement,
      ref: arrowRef
    }
  }, renderProps.children));
}

// src/components/components/shared/overlayHelpers.tsx
import React10, { forwardRef as forwardRef3, useState } from "react";
var import_memoizerific = __toESM(require_memoizerific(), 1);
import { styled as styled27 } from "storybook/theming";
var convertToReactAriaPlacement = (0, import_memoizerific.default)(1e3)((p) => p === "left-end" ? "left bottom" : p === "right-end" ? "right bottom" : p === "left-start" ? "left top" : p === "right-start" ? "right top" : p.replace("-", " ")), Container = styled27.div({
  width: 500,
  height: 500,
  paddingTop: 100,
  overflowY: "scroll",
  background: "#eee",
  position: "relative"
}), Trigger = forwardRef3((props, ref) => React10.createElement(
  "button",
  {
    ...props,
    ref,
    style: {
      width: 120,
      height: 50,
      margin: 10
    }
  }
));
Trigger.displayName = "Trigger";

// src/components/components/tooltip/TooltipProvider.tsx
var TooltipProvider = ({
  triggerOnFocusOnly = !1,
  placement: placementProp = "top",
  offset = 8,
  tooltip,
  children,
  defaultVisible,
  startOpen,
  delayShow = 400,
  delayHide = 200,
  visible,
  onVisibleChange,
  ...props
}) => {
  let placement = convertToReactAriaPlacement(placementProp), child = React11.Children.only(children);
  startOpen !== void 0 && deprecate("The `startOpen` prop is deprecated. Please use `defaultVisible` instead.");
  let [isOpen, setIsOpen] = useState2(defaultVisible ?? startOpen ?? !1), onOpenChange = useCallback2(
    (isOpen2) => {
      setIsOpen(isOpen2), onVisibleChange?.(isOpen2);
    },
    [onVisibleChange]
  );
  return React11.createElement(
    $4e3b923658d69c60$export$8c610744efcf8a1d,
    {
      delay: delayShow,
      closeDelay: delayHide,
      isOpen: visible ?? isOpen,
      onOpenChange,
      trigger: triggerOnFocusOnly ? "focus" : void 0,
      ...props
    },
    React11.createElement($f645667febf57a63$export$35a3bebf7ef2d934, null, React11.cloneElement(child, { "aria-describedby": null })),
    React11.createElement(
      $4e3b923658d69c60$export$28c660c63b792dea,
      {
        "data-testid": "tooltip",
        placement,
        offset,
        onOpenChange,
        style: { outline: "none" },
        ...props
      },
      tooltip
    )
  );
};

// src/components/components/Button/helpers/InteractiveTooltipWrapper.tsx
var InteractiveTooltipWrapper = ({ children, disableAllTooltips, shortcut, tooltip }) => {
  let tooltipLabel = useMemo(() => {
    let hasShortcuts = document?.body?.getAttribute("data-shortcuts-enabled") !== "false";
    if (!(!tooltip && (!shortcut || !hasShortcuts)))
      return [tooltip, shortcut && hasShortcuts && `[${shortcutToHumanString(shortcut)}]`].filter(Boolean).join(" ");
  }, [shortcut, tooltip]);
  return tooltipLabel ? React12.createElement(
    TooltipProvider,
    {
      placement: "top",
      tooltip: React12.createElement(TooltipNote, { note: tooltipLabel }),
      visible: disableAllTooltips ? !1 : void 0
    },
    children
  ) : React12.createElement(React12.Fragment, null, children);
};
InteractiveTooltipWrapper.displayName = "InteractiveTooltipWrapper";

// src/components/components/Button/helpers/useAriaDescription.tsx
import React13 from "react";
function useAriaDescription(description = "") {
  let describedbyId = description.toLowerCase().trim().replace(/\s+/g, "-");
  return {
    ariaDescriptionAttrs: {
      "aria-describedby": description ? describedbyId : void 0
    },
    AriaDescription: () => description ? React13.createElement("span", { id: describedbyId, hidden: !0 }, description) : null
  };
}

// src/components/components/Button/Button.tsx
var Button = forwardRef4(
  ({
    as = "button",
    asChild = !1,
    animation = "none",
    size = "small",
    variant = "outline",
    padding = "medium",
    disabled = !1,
    readOnly = !1,
    active,
    onClick,
    ariaLabel,
    ariaDescription = void 0,
    tooltip = void 0,
    shortcut = void 0,
    disableAllTooltips = !1,
    ...props
  }, ref) => {
    let Comp2 = asChild ? Slot : as, deprecated;
    !readOnly && (ariaLabel === void 0 || ariaLabel === "") && (deprecated = "ariaLabel", deprecate2(
      `The 'ariaLabel' prop on 'Button' will become mandatory in Storybook 11. Buttons with text content should set 'ariaLabel={false}' to indicate that they are accessible as-is. Buttons without text content must provide a meaningful 'ariaLabel' for accessibility. The button content is: ${props.children}.`
    )), active !== void 0 && (deprecated = "active", deprecate2(
      "The `active` prop on `Button` is deprecated and will be removed in Storybook 11. Use specialized components like `ToggleButton` or `Select` instead."
    ));
    let { ariaDescriptionAttrs, AriaDescription } = useAriaDescription(ariaDescription), shortcutAttribute = useMemo2(() => shortcut ? shortcutToAriaKeyshortcuts(shortcut) : void 0, [shortcut]), [isAnimating, setIsAnimating] = useState3(!1), handleClick = (event) => {
      onClick && onClick(event), animation !== "none" && setIsAnimating(!0);
    };
    return useEffect(() => {
      let timer = setTimeout(() => {
        isAnimating && setIsAnimating(!1);
      }, 1e3);
      return () => clearTimeout(timer);
    }, [isAnimating]), React14.createElement(React14.Fragment, null, React14.createElement(
      InteractiveTooltipWrapper,
      {
        disableAllTooltips,
        shortcut,
        tooltip: tooltip || (ariaLabel !== !1 ? ariaLabel : void 0)
      },
      React14.createElement(
        StyledButton,
        {
          "data-deprecated": deprecated,
          as: Comp2,
          ref,
          variant,
          size,
          padding,
          disabled: disabled || readOnly,
          readOnly,
          active,
          animating: isAnimating,
          animation,
          onClick: handleClick,
          "aria-label": !readOnly && ariaLabel !== !1 ? ariaLabel : void 0,
          "aria-keyshortcuts": readOnly ? void 0 : shortcutAttribute,
          ...readOnly ? {} : ariaDescriptionAttrs,
          ...props
        }
      )
    ), React14.createElement(AriaDescription, null));
  }
);
Button.displayName = "Button";
var StyledButton = styled28("button", {
  shouldForwardProp: (prop) => isPropValid(prop)
})(
  ({
    theme,
    variant,
    size,
    disabled,
    readOnly,
    active,
    animating,
    animation = "none",
    padding
  }) => ({
    border: 0,
    cursor: readOnly ? "inherit" : disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    gap: "6px",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: padding === "none" ? 0 : padding === "small" && size === "small" ? "0 7px" : padding === "small" && size === "medium" ? "0 9px" : size === "small" ? "0 10px" : size === "medium" ? "0 12px" : 0,
    height: size === "small" ? "28px" : "32px",
    position: "relative",
    textAlign: "center",
    textDecoration: "none",
    transitionProperty: "background, box-shadow",
    transitionDuration: "150ms",
    transitionTimingFunction: "ease-out",
    verticalAlign: "top",
    whiteSpace: "nowrap",
    userSelect: "none",
    opacity: disabled && !readOnly ? 0.5 : 1,
    margin: 0,
    fontSize: `${theme.typography.size.s1}px`,
    fontWeight: theme.typography.weight.bold,
    lineHeight: "1",
    background: variant === "solid" ? theme.base === "light" ? theme.color.secondary : curriedDarken$1(0.18, theme.color.secondary) : variant === "outline" ? theme.button.background : variant === "ghost" && active ? curriedTransparentize$1(0.93, theme.barSelectedColor) : "transparent",
    color: variant === "solid" ? theme.color.lightest : variant === "outline" ? theme.input.color : variant === "ghost" && active ? theme.base === "light" ? curriedDarken$1(0.1, theme.color.secondary) : theme.color.secondary : variant === "ghost" ? theme.textMutedColor : theme.input.color,
    boxShadow: variant === "outline" ? `${theme.button.border} 0 0 0 1px inset` : "none",
    borderRadius: theme.input.borderRadius,
    // Making sure that the button never shrinks below its minimum size
    flexShrink: 0,
    ...!readOnly && {
      "&:hover": {
        color: variant === "ghost" ? theme.color.secondary : void 0,
        background: (() => {
          let bgColor = theme.color.secondary;
          return variant === "solid" && (bgColor = theme.base === "light" ? curriedLighten$1(0.1, theme.color.secondary) : curriedDarken$1(0.3, theme.color.secondary)), variant === "outline" && (bgColor = theme.button.background), variant === "ghost" ? curriedTransparentize$1(0.86, theme.color.secondary) : theme.base === "light" ? curriedDarken$1(0.02, bgColor) : curriedLighten$1(0.03, bgColor);
        })()
      },
      "&:active": {
        color: variant === "ghost" ? theme.color.secondary : void 0,
        background: (() => {
          let bgColor = theme.color.secondary;
          return variant === "solid" && (bgColor = theme.color.secondary), variant === "outline" && (bgColor = theme.button.background), variant === "ghost" ? theme.background.hoverable : theme.base === "light" ? curriedDarken$1(0.02, bgColor) : curriedLighten$1(0.03, bgColor);
        })()
      },
      "&:focus-visible": {
        outline: `2px solid ${rgba(theme.color.secondary, 1)}`,
        outlineOffset: 2,
        // Should ensure focus outline gets drawn above next sibling
        zIndex: "1"
      },
      ".sb-bar &:focus-visible, .sb-list &:focus-visible": {
        outlineOffset: 0
      }
    },
    "> svg": {
      flex: "0 0 auto",
      animation: animating && animation !== "none" ? `${theme.animation[animation]} 1000ms ease-out` : ""
    }
  })
), IconButton = forwardRef4((props, ref) => (deprecate2(
  "`IconButton` is deprecated and will be removed in Storybook 11, use `Button` instead."
), React14.createElement(Button, { ref, ...props, "data-deprecated": "IconButton" })));
IconButton.displayName = "IconButton";

// src/components/components/ToggleButton/ToggleButton.tsx
import React15, { forwardRef as forwardRef5 } from "react";
import { styled as styled29 } from "storybook/theming";
var ToggleButton = forwardRef5(
  ({ pressed, ...props }, ref) => React15.createElement(StyledToggle, { role: "switch", "aria-checked": pressed, ref, pressed, ...props })
);
ToggleButton.displayName = "ToggleButton";
var StyledToggle = styled29(Button)(
  ({ theme, variant = "outline", pressed }) => ({
    ...pressed ? {
      ...variant === "solid" ? {
        background: theme.base === "lighten" ? curriedDarken$1(0.1, theme.color.secondary) : curriedDarken$1(0.2, theme.color.secondary)
      } : {},
      ...variant === "outline" ? {
        background: curriedTransparentize$1(0.94, theme.barSelectedColor),
        boxShadow: `${theme.barSelectedColor} 0 0 0 1px inset`,
        color: theme.barSelectedColor
      } : {},
      ...variant === "ghost" ? {
        background: curriedTransparentize$1(0.93, theme.barSelectedColor),
        color: theme.base === "light" ? curriedDarken$1(0.1, theme.color.secondary) : theme.color.secondary
      } : {}
    } : {}
  })
);

// src/components/components/ActionList/ActionList.tsx
var ActionListItem = styled30.li(
  ({ active, theme }) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flex: "0 0 auto",
    overflow: "hidden",
    gap: 4,
    fontSize: theme.typography.size.s1,
    fontWeight: active ? theme.typography.weight.bold : theme.typography.weight.regular,
    color: active ? theme.color.secondary : theme.color.defaultText,
    "--listbox-item-muted-color": active ? theme.color.secondary : theme.color.mediumdark,
    "&:not(:hover, :has(:focus-visible)) svg + input": {
      position: "absolute",
      opacity: 0
    },
    "@supports (interpolate-size: allow-keywords)": {
      interpolateSize: "allow-keywords",
      transition: "all var(--transition-duration, 0.2s)",
      transitionBehavior: "allow-discrete"
    },
    "@media (prefers-reduced-motion: reduce)": {
      transition: "none"
    }
  }),
  ({ transitionStatus }) => {
    switch (transitionStatus) {
      case "preEnter":
      case "exiting":
      case "exited":
        return {
          opacity: 0,
          blockSize: 0,
          contentVisibility: "hidden"
        };
      default:
        return {
          opacity: 1,
          blockSize: "auto",
          contentVisibility: "visible"
        };
    }
  }
), ActionListHoverItem = styled30(ActionListItem)(({ targetId }) => ({
  gap: 0,
  [`& [data-target-id="${targetId}"]`]: {
    inlineSize: "auto",
    marginLeft: 4,
    opacity: 1,
    "@supports (interpolate-size: allow-keywords)": {
      interpolateSize: "allow-keywords",
      transitionProperty: "inline-size, margin-left, opacity, padding-inline",
      transitionDuration: "var(--transition-duration, 0.2s)"
    }
  },
  [`&:not(:hover, :has(:focus-visible)) [data-target-id="${targetId}"]`]: {
    inlineSize: 0,
    marginLeft: 0,
    opacity: 0,
    paddingInline: 0
  }
})), StyledButton2 = styled30(Button)({
  "&:focus-visible": {
    // Prevent focus outline from being cut off by overflow: hidden
    outlineOffset: -2
  }
}), StyledToggleButton = styled30(ToggleButton)({
  "&:focus-visible": {
    // Prevent focus outline from being cut off by overflow: hidden
    outlineOffset: -2
  }
}), ActionListButton = forwardRef6(
  function({ padding = "small", size = "medium", variant = "ghost", ...props }, ref) {
    return React16.createElement(StyledButton2, { ...props, variant, padding, size, ref });
  }
), ActionListToggle = forwardRef6(
  function({ padding = "small", size = "medium", variant = "ghost", ...props }, ref) {
    return React16.createElement(StyledToggleButton, { ...props, variant, padding, size, ref });
  }
), ActionListAction = styled30(ActionListButton)(({ theme }) => ({
  flex: "0 1 100%",
  textAlign: "start",
  justifyContent: "space-between",
  fontWeight: "inherit",
  color: "inherit",
  "&:hover": {
    color: "inherit"
  },
  "& input:enabled:focus-visible": {
    outline: "none"
  },
  "&:has(input:focus-visible)": {
    outline: `2px solid ${theme.color.secondary}`,
    outlineOffset: -2
  }
})), ActionListLink = (props) => React16.createElement(ActionListAction, { as: "a", ...props }), ActionListText = styled30.div({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexGrow: 1,
  minWidth: 0,
  padding: "8px 0",
  lineHeight: "16px",
  "& span": {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  "&:first-child": {
    paddingLeft: 8
  },
  "&:last-child": {
    paddingRight: 8
  },
  "button > &:first-child": {
    paddingLeft: 0
  },
  "button > &:last-child": {
    paddingRight: 0
  }
}), ActionListIcon = styled30.div({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 14px",
  width: 14,
  height: 14,
  color: "var(--listbox-item-muted-color)"
}), ActionList = Object.assign(
  styled30.ul(({ theme, onClick }) => ({
    listStyle: "none",
    margin: 0,
    padding: 4,
    cursor: onClick ? "pointer" : "default",
    "& + *": {
      borderTop: `1px solid ${theme.appBorderColor}`
    }
  })),
  {
    Item: ActionListItem,
    HoverItem: ActionListHoverItem,
    Button: ActionListButton,
    Toggle: ActionListToggle,
    Action: ActionListAction,
    Link: ActionListLink,
    Text: ActionListText,
    Icon: ActionListIcon
  }
);

// src/components/components/Collapsible/Collapsible.tsx
import React17, {
  useCallback as useCallback3,
  useEffect as useEffect2,
  useState as useState4
} from "react";
import { styled as styled31 } from "storybook/theming";
var CollapsibleContent = styled31.div(({ collapsed = !1 }) => ({
  blockSize: collapsed ? 0 : "auto",
  contentVisibility: collapsed ? "hidden" : "visible",
  transform: collapsed ? "translateY(-10px)" : "translateY(0)",
  opacity: collapsed ? 0 : 1,
  overflow: "hidden",
  "@supports (interpolate-size: allow-keywords)": {
    interpolateSize: "allow-keywords",
    transition: "all var(--transition-duration, 0.2s)",
    transitionBehavior: "allow-discrete"
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none"
  }
})), Collapsible = Object.assign(
  function({
    children,
    summary,
    collapsed,
    disabled,
    state: providedState,
    ...props
  }) {
    let internalState = useCollapsible(collapsed, disabled), state = providedState || internalState;
    return React17.createElement(React17.Fragment, null, typeof summary == "function" ? summary(state) : summary, React17.createElement(
      CollapsibleContent,
      {
        ...props,
        id: state.contentId,
        collapsed: state.isCollapsed,
        "aria-hidden": state.isCollapsed
      },
      typeof children == "function" ? children(state) : children
    ));
  },
  {
    Content: CollapsibleContent
  }
), useCollapsible = (collapsed, disabled) => {
  let [isCollapsed, setCollapsed] = useState4(!!collapsed);
  useEffect2(() => {
    collapsed !== void 0 && setCollapsed(collapsed);
  }, [collapsed]);
  let toggleCollapsed = useCallback3(
    (event) => {
      event?.stopPropagation(), disabled || setCollapsed((value) => !value);
    },
    [disabled]
  ), contentId = $bdb11010cef70236$export$f680877a34711e37();
  return {
    contentId,
    isCollapsed,
    isDisabled: !!disabled,
    setCollapsed,
    toggleCollapsed,
    toggleProps: {
      disabled,
      onClick: toggleCollapsed,
      "aria-controls": contentId,
      "aria-expanded": !isCollapsed
    }
  };
};

// src/components/components/Card/Card.tsx
import React18, { forwardRef as forwardRef7 } from "react";
import { keyframes, styled as styled32 } from "storybook/theming";
var fadeInOut = keyframes({
  "0%": { opacity: 0 },
  "5%": { opacity: 1 },
  "25%": { opacity: 1 },
  "30%": { opacity: 0 }
}), spin = keyframes({
  "0%": { transform: "rotate(0deg)" },
  "10%": { transform: "rotate(10deg)" },
  "40%": { transform: "rotate(170deg)" },
  "50%": { transform: "rotate(180deg)" },
  "60%": { transform: "rotate(190deg)" },
  "90%": { transform: "rotate(350deg)" },
  "100%": { transform: "rotate(360deg)" }
}), slide = keyframes({
  to: {
    backgroundPositionX: "36%"
  }
}), CardContent = styled32.div(({ theme }) => ({
  borderRadius: theme.appBorderRadius,
  backgroundColor: theme.background.content,
  position: "relative"
})), CardOutline = styled32.div(({ animation = "none", color: color4, theme }) => ({
  position: "relative",
  width: "100%",
  padding: 1,
  overflow: "hidden",
  backgroundColor: theme.background.content,
  borderRadius: theme.appBorderRadius + 1,
  boxShadow: `inset 0 0 0 1px ${animation === "none" && color4 && theme.color[color4] || theme.appBorderColor}, var(--card-box-shadow, transparent 0 0)`,
  transition: "box-shadow 1s",
  "@supports (interpolate-size: allow-keywords)": {
    interpolateSize: "allow-keywords",
    transition: "all var(--transition-duration, 0.2s), box-shadow 1s",
    transitionBehavior: "allow-discrete"
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "box-shadow 1s"
  },
  "&:before": {
    content: '""',
    display: animation === "none" ? "none" : "block",
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    opacity: 1,
    ...animation === "rainbow" && {
      animation: `${slide} 10s infinite linear, ${fadeInOut} 60s infinite linear`,
      backgroundImage: "linear-gradient(45deg,rgb(234, 0, 0),rgb(255, 157, 0),rgb(255, 208, 0),rgb(0, 172, 0),rgb(0, 166, 255),rgb(181, 0, 181), rgb(234, 0, 0),rgb(255, 157, 0),rgb(255, 208, 0),rgb(0, 172, 0),rgb(0, 166, 255),rgb(181, 0, 181))",
      backgroundSize: "1000%",
      backgroundPositionX: "100%"
    },
    ...animation === "spin" && {
      left: "50%",
      top: "50%",
      marginLeft: "calc(max(100vw, 100vh) * -0.5)",
      marginTop: "calc(max(100vw, 100vh) * -0.5)",
      height: "max(100vw, 100vh)",
      width: "max(100vw, 100vh)",
      animation: `${spin} 3s linear infinite`,
      backgroundImage: color4 === "negative" ? (
        // Hardcoded colors to prevent themes from messing with them (orange+gold, secondary+seafoam)
        "conic-gradient(transparent 90deg, #FC521F 150deg, #FFAE00 210deg, transparent 270deg)"
      ) : "conic-gradient(transparent 90deg, #029CFD 150deg, #37D5D3 210deg, transparent 270deg)"
    }
  }
})), Card = Object.assign(
  forwardRef7(function({ outlineAnimation = "none", outlineColor, ...props }, ref) {
    return React18.createElement(CardOutline, { animation: outlineAnimation, color: outlineColor, ref }, React18.createElement(CardContent, { ...props }));
  }),
  {
    Content: CardContent,
    Outline: CardOutline
  }
);

// src/components/components/Modal/Modal.tsx
import React20, { createContext, useEffect as useEffect4, useRef as useRef3, useState as useState8 } from "react";
import { deprecate as deprecate4 } from "storybook/internal/client-logger";

// ../node_modules/react-transition-state/dist/esm/hooks/useTransitionState.mjs
import { useState as useState5, useRef, useCallback as useCallback4 } from "react";

// ../node_modules/react-transition-state/dist/esm/hooks/utils.mjs
var STATUS = ["preEnter", "entering", "entered", "preExit", "exiting", "exited", "unmounted"], getState = (status) => ({
  _s: status,
  status: STATUS[status],
  isEnter: status < 3,
  isMounted: status !== 6,
  isResolved: status === 2 || status > 4
}), startOrEnd = (unmounted) => unmounted ? 6 : 5, getEndStatus = (status, unmountOnExit) => {
  switch (status) {
    case 1:
    case 0:
      return 2;
    case 4:
    case 3:
      return startOrEnd(unmountOnExit);
  }
}, getTimeout = (timeout) => typeof timeout == "object" ? [timeout.enter, timeout.exit] : [timeout, timeout], nextTick = (transitState, status) => setTimeout(() => {
  isNaN(document.body.offsetTop) || transitState(status + 1);
}, 0);

// ../node_modules/react-transition-state/dist/esm/hooks/useTransitionState.mjs
var updateState = (status, setState, latestState, timeoutId, onChange) => {
  clearTimeout(timeoutId.current);
  let state = getState(status);
  setState(state), latestState.current = state, onChange && onChange({
    current: state
  });
}, useTransitionState = ({
  enter = !0,
  exit = !0,
  preEnter,
  preExit,
  timeout,
  initialEntered,
  mountOnEnter,
  unmountOnExit,
  onStateChange: onChange
} = {}) => {
  let [state, setState] = useState5(() => getState(initialEntered ? 2 : startOrEnd(mountOnEnter))), latestState = useRef(state), timeoutId = useRef(), [enterTimeout, exitTimeout] = getTimeout(timeout), endTransition = useCallback4(() => {
    let status = getEndStatus(latestState.current._s, unmountOnExit);
    status && updateState(status, setState, latestState, timeoutId, onChange);
  }, [onChange, unmountOnExit]), toggle = useCallback4((toEnter) => {
    let transitState = (status) => {
      switch (updateState(status, setState, latestState, timeoutId, onChange), status) {
        case 1:
          enterTimeout >= 0 && (timeoutId.current = setTimeout(endTransition, enterTimeout));
          break;
        case 4:
          exitTimeout >= 0 && (timeoutId.current = setTimeout(endTransition, exitTimeout));
          break;
        case 0:
        case 3:
          timeoutId.current = nextTick(transitState, status);
          break;
      }
    }, enterStage = latestState.current.isEnter;
    typeof toEnter != "boolean" && (toEnter = !enterStage), toEnter ? !enterStage && transitState(enter ? preEnter ? 0 : 1 : 2) : enterStage && transitState(exit ? preExit ? 3 : 4 : startOrEnd(unmountOnExit));
  }, [endTransition, onChange, enter, exit, preEnter, preExit, enterTimeout, exitTimeout, unmountOnExit]);
  return [state, toggle, endTransition];
};

// ../node_modules/react-transition-state/dist/esm/hooks/useTransitionMap.mjs
import { useState as useState6, useRef as useRef2, useCallback as useCallback5 } from "react";

// src/manager/hooks/useMedia.tsx
import { useEffect as useEffect3, useState as useState7 } from "react";
function useMediaQuery(query) {
  let getMatches = (queryMatch) => typeof window < "u" ? window.matchMedia(queryMatch).matches : !1, [matches, setMatches] = useState7(getMatches(query));
  function handleChange() {
    setMatches(getMatches(query));
  }
  return useEffect3(() => {
    let matchMedia = window.matchMedia(query);
    return handleChange(), matchMedia.addEventListener("change", handleChange), () => {
      matchMedia.removeEventListener("change", handleChange);
    };
  }, [query]), matches;
}

// src/components/components/Modal/Modal.styled.tsx
var Modal_styled_exports = {};
__export(Modal_styled_exports, {
  Actions: () => Actions,
  Close: () => Close,
  CloseButton: () => CloseButton,
  Col: () => Col,
  Container: () => Container2,
  Content: () => Content,
  Description: () => Description,
  Dialog: () => Dialog,
  Error: () => Error2,
  ErrorWrapper: () => ErrorWrapper,
  Header: () => Header,
  Overlay: () => Overlay,
  Row: () => Row,
  Title: () => Title
});
import React19, { useContext } from "react";
import { deprecate as deprecate3 } from "storybook/internal/client-logger";
import { CrossIcon } from "@storybook/icons";

// ../node_modules/react-aria-components/dist/RSPContexts.mjs
import { createContext as $95phC$createContext } from "react";
var $4e85f108e88277b8$export$b085522c77523c51 = $95phC$createContext(null), $4e85f108e88277b8$export$ebe63fadcdce34ed = $95phC$createContext(null), $4e85f108e88277b8$export$44644b8a16031b5b = $95phC$createContext(null), $4e85f108e88277b8$export$717b2c0a523a0b53 = $95phC$createContext(null), $4e85f108e88277b8$export$265015d6dc85bf21 = $95phC$createContext(null), $4e85f108e88277b8$export$d688439359537581 = $95phC$createContext({});

// ../node_modules/react-aria-components/dist/Heading.mjs
import $bt28J$react, { forwardRef as $bt28J$forwardRef } from "react";
var $5cb03073d3f54797$export$a8a3e93435678ff9 = $bt28J$forwardRef(function(props, ref) {
  [props, ref] = $64fa3d84918910a7$export$29f1550f4b0d4415(props, ref, $4e85f108e88277b8$export$d688439359537581);
  let { children, level = 3, className, ...domProps } = props, Element2 = `h${level}`;
  return $bt28J$react.createElement(Element2, {
    ...domProps,
    ref,
    className: className ?? "react-aria-Heading"
  }, children);
});

// ../node_modules/react-aria-components/dist/Text.mjs
import $1B3Dx$react, { createContext as $1B3Dx$createContext, forwardRef as $1B3Dx$forwardRef } from "react";
var $514c0188e459b4c0$export$9afb8bc826b033ea = $1B3Dx$createContext({}), $514c0188e459b4c0$export$5f1af8db9871e1d6 = $1B3Dx$forwardRef(function(props, ref) {
  [props, ref] = $64fa3d84918910a7$export$29f1550f4b0d4415(props, ref, $514c0188e459b4c0$export$9afb8bc826b033ea);
  let { elementType: ElementType = "span", ...domProps } = props;
  return $1B3Dx$react.createElement(ElementType, {
    className: "react-aria-Text",
    ...domProps,
    ref
  });
});

// src/components/components/Modal/Modal.styled.tsx
import { keyframes as keyframes2, styled as styled33 } from "storybook/theming";
var fadeIn = keyframes2({
  from: { opacity: 0 },
  to: { opacity: 1 }
}), fadeOut = keyframes2({
  from: { opacity: 1 },
  to: { opacity: 0 }
}), expand = keyframes2({
  from: { maxHeight: 0 },
  to: {}
}), zoomIn = keyframes2({
  from: {
    opacity: 0,
    transform: "translate(-50%, -50%) scale(0.9)"
  },
  to: {
    opacity: 1,
    transform: "translate(-50%, -50%) scale(1)"
  }
}), zoomOut = keyframes2({
  from: {
    opacity: 1,
    transform: "translate(-50%, -50%) scale(1)"
  },
  to: {
    opacity: 0,
    transform: "translate(-50%, -50%) scale(0.9)"
  }
}), slideFromBottom = keyframes2({
  from: {
    opacity: 0,
    maxHeight: "0px"
  },
  to: {
    opacity: 1,
    maxHeight: "80vh"
  }
}), slideToBottom = keyframes2({
  from: {
    opacity: 1,
    maxHeight: "80vh"
  },
  to: {
    opacity: 0,
    maxHeight: "0px"
  }
}), Overlay = styled33.div(({ $status, $transitionDuration }) => ({
  backdropFilter: "blur(24px)",
  background: "rgba(0, 0, 0, 0.4)",
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  zIndex: 90,
  "@media (prefers-reduced-motion: no-preference)": {
    animation: $status === "exiting" || $status === "preExit" ? `${fadeOut} ${$transitionDuration}ms` : `${fadeIn} ${$transitionDuration}ms`,
    animationFillMode: "forwards"
  }
})), Container2 = styled33.div(
  ({ theme }) => ({
    backgroundColor: theme.background.bar,
    borderRadius: 6,
    boxShadow: "0px 4px 67px 0px #00000040",
    position: "absolute",
    overflow: "auto",
    zIndex: 100,
    "&:focus-visible": {
      outline: "none"
    }
  }),
  ({ width, height, $variant, $status, $transitionDuration }) => $variant === "dialog" ? {
    top: "50%",
    left: "50%",
    width: width ?? 740,
    height: height ?? "auto",
    maxWidth: "calc(100% - 40px)",
    maxHeight: "85vh",
    "@media (prefers-reduced-motion: no-preference)": {
      willChange: "transform, opacity",
      animationTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
      animation: $status === "exiting" || $status === "preExit" ? `${zoomOut} ${$transitionDuration}ms` : `${zoomIn} ${$transitionDuration}ms`,
      animationFillMode: "forwards !important"
    },
    "@media (prefers-reduced-motion: reduce)": {
      transform: "translate(-50%, -50%) scale(1)"
    }
  } : {
    bottom: "0",
    left: "0",
    right: "0",
    width: width ?? "100%",
    height: height ?? "80%",
    maxWidth: "100%",
    "@supports (interpolate-size: allow-keywords)": {
      interpolateSize: "allow-keywords"
    },
    "@media (prefers-reduced-motion: no-preference)": {
      animationTimingFunction: "cubic-bezier(.9,.16,.77,.64)",
      animation: $status === "exiting" || $status === "preExit" ? `${slideToBottom} ${$transitionDuration}ms` : `${slideFromBottom} ${$transitionDuration}ms`,
      animationFillMode: "forwards !important"
    }
  }
), Close = ({ asChild, children, onClick, ...props }) => {
  let { close } = useContext(ModalContext);
  if (asChild && React19.isValidElement(children)) {
    let handleClick = (event) => {
      onClick?.(event), children.props.onClick?.(event), close?.();
    };
    return React19.cloneElement(children, {
      ...props,
      onClick: handleClick
    });
  }
  return React19.createElement(
    Button,
    {
      padding: "small",
      ariaLabel: "Close modal",
      variant: "ghost",
      shortcut: ["Escape"],
      onClick: close
    },
    React19.createElement(CrossIcon, null)
  );
}, Dialog = {
  Close: () => (deprecate3("Modal.Dialog.Close is deprecated, please use Modal.Close instead."), React19.createElement(Close, { "data-deprecated": "Modal.Dialog.Close" }))
}, CloseButton = ({ ariaLabel, ...props }) => (deprecate3("Modal.CloseButton is deprecated, please use Modal.Close instead."), React19.createElement(Close, { asChild: !0 }, React19.createElement(Button, { ariaLabel: ariaLabel || "Close", "data-deprecated": "Modal.CloseButton", ...props }, React19.createElement(CrossIcon, null)))), Content = styled33.div({
  display: "flex",
  flexDirection: "column",
  margin: 16,
  gap: 16
}), Row = styled33.div({
  display: "flex",
  justifyContent: "space-between",
  gap: 16
}), Col = styled33.div({
  display: "flex",
  flexDirection: "column",
  gap: 4
}), Header = ({
  hasClose = !0,
  onClose,
  ...props
}) => React19.createElement(Row, null, React19.createElement(Col, { ...props }), hasClose && React19.createElement(Close, { onClick: onClose })), Title = styled33((props) => React19.createElement($5cb03073d3f54797$export$a8a3e93435678ff9, { level: 2, ...props }))(({ theme }) => ({
  margin: 0,
  fontSize: theme.typography.size.s3,
  fontWeight: theme.typography.weight.bold
})), Description = styled33($514c0188e459b4c0$export$5f1af8db9871e1d6)(({ theme }) => ({
  position: "relative",
  zIndex: 1,
  margin: 0,
  fontSize: theme.typography.size.s2
})), Actions = styled33.div({
  display: "flex",
  flexDirection: "row-reverse",
  gap: 8
}), ErrorWrapper = styled33.div(({ theme }) => ({
  maxHeight: 100,
  overflow: "auto",
  "@media (prefers-reduced-motion: no-preference)": {
    animation: `${expand} 300ms, ${fadeIn} 300ms`
  },
  backgroundColor: theme.background.critical,
  color: theme.color.lightest,
  fontSize: theme.typography.size.s2,
  "& > div": {
    position: "relative",
    padding: "8px 16px"
  }
})), Error2 = ({
  children,
  ...props
}) => React19.createElement(ErrorWrapper, { ...props }, React19.createElement("div", null, children));

// src/components/components/Modal/Modal.tsx
var ModalContext = createContext({});
function BaseModal({
  container,
  portalSelector,
  children,
  width,
  height,
  ariaLabel,
  dismissOnClickOutside = !0,
  dismissOnEscape = !0,
  className,
  open,
  onEscapeKeyDown,
  onInteractOutside,
  onOpenChange,
  defaultOpen,
  transitionDuration = 200,
  variant = "dialog",
  ...props
}) {
  let deprecated;
  (ariaLabel === void 0 || ariaLabel === "") && (deprecated = "ariaLabel", deprecate4("The `ariaLabel` prop on `Modal` will become mandatory in Storybook 11.")), onEscapeKeyDown !== void 0 && (deprecated = "onEscapeKeyDown", deprecate4(
    "The `onEscapeKeyDown` prop is deprecated and will be removed in Storybook 11. Use `dismissOnEscape` instead."
  )), onInteractOutside !== void 0 && (deprecated = "onInteractOutside", deprecate4(
    "The `onInteractOutside` prop is deprecated and will be removed in Storybook 11. Use `dismissOnInteractOutside` instead."
  ));
  let overlayRef = useRef3(null), reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)"), [{ status, isMounted }, toggle] = useTransitionState({
    timeout: reducedMotion ? 0 : transitionDuration,
    mountOnEnter: !0,
    unmountOnExit: !0
  }), state = $fc909762b330b746$export$61c6a8c84e605fb6({
    isOpen: open || isMounted,
    defaultOpen,
    onOpenChange: (isOpen) => {
      toggle(isOpen), onOpenChange?.(isOpen);
    }
  }), close = () => {
    state.close();
  }, { modalProps, underlayProps } = $8ac8429251c45e4b$export$dbc0f175b25fb0fb(
    {
      isDismissable: dismissOnClickOutside,
      isKeyboardDismissDisabled: !0,
      shouldCloseOnInteractOutside: onInteractOutside ? (element) => {
        let mockedEvent = new MouseEvent("click", {
          bubbles: !0,
          cancelable: !0,
          relatedTarget: element
        });
        return onInteractOutside(mockedEvent), !mockedEvent.defaultPrevented;
      } : void 0
    },
    state,
    overlayRef
  );
  if (useEffect4(() => {
    let shouldBeOpen = open ?? defaultOpen ?? !1;
    shouldBeOpen && !isMounted ? toggle(!0) : !shouldBeOpen && isMounted && toggle(!1);
  }, [open, defaultOpen, isMounted, toggle]), useEffect4(() => {
    isMounted && (open || defaultOpen) && onOpenChange?.(!0);
  }, [isMounted]), useEffect4(() => {
    if (isMounted && (open || defaultOpen) && overlayRef.current)
      return $5e3802645cc19319$export$1c3ebcada18427bf([overlayRef.current], { shouldUseInert: !0 });
  }, [isMounted, open, defaultOpen, overlayRef]), !isMounted || status === "exited" || status === "unmounted")
    return null;
  let finalModalProps = $3ef42575df84b30b$export$9d1611c77c2fe928(modalProps, {
    onKeyDown: (e) => {
      e.key !== "Escape" ? modalProps.onKeyDown?.(e) : dismissOnEscape && (onEscapeKeyDown?.(e.nativeEvent), e.nativeEvent.defaultPrevented || close());
    }
  }), containerElement = container ?? (portalSelector ? document.querySelector(portalSelector) : void 0);
  return React20.createElement($337b884510726a0d$export$c6fdb837b070b4ff, { disableFocusManagement: !0, portalContainer: containerElement || void 0 }, React20.createElement($9bf71ea28793e738$export$20e40289641fbbb6, { restoreFocus: !0, contain: !0, autoFocus: !0 }, React20.createElement(
    Overlay,
    {
      $status: status,
      $transitionDuration: transitionDuration,
      ...underlayProps
    }
  ), React20.createElement("div", { role: "dialog", "aria-label": ariaLabel, ref: overlayRef, ...finalModalProps }, React20.createElement(ModalContext.Provider, { value: { close } }, React20.createElement(
    Container2,
    {
      "data-deprecated": deprecated,
      $variant: variant,
      $status: status,
      $transitionDuration: transitionDuration,
      className,
      width,
      height,
      ...props
    },
    children
  )))));
}
var Modal = Object.assign(BaseModal, Modal_styled_exports), ModalDecorator = (Story, { args }) => {
  let [container, setContainer] = useState8(null);
  return args.container || args.portalSelector ? React20.createElement(Story, { args }) : React20.createElement(React20.Fragment, null, React20.createElement($96b38030c423d352$export$78efe591171d7d45, { getContainer: () => container }, React20.createElement(Story, { args })), React20.createElement(
    "div",
    {
      ref: (element) => setContainer(element ?? null),
      style: {
        width: "100%",
        height: "100%",
        minHeight: "600px",
        transform: "translateZ(0)"
      }
    }
  ));
};

// src/components/components/spaced/Spaced.tsx
import React21 from "react";
import { ignoreSsrWarning, styled as styled34 } from "storybook/theming";
var toNumber = (input) => typeof input == "number" ? input : Number(input), Container3 = styled34.div(
  ({ theme, col, row = 1 }) => col ? {
    display: "inline-block",
    verticalAlign: "inherit",
    "& > *": {
      marginLeft: col * theme.layoutMargin,
      verticalAlign: "inherit"
    },
    [`& > *:first-child${ignoreSsrWarning}`]: {
      marginLeft: 0
    }
  } : {
    "& > *": {
      marginTop: row * theme.layoutMargin
    },
    [`& > *:first-child${ignoreSsrWarning}`]: {
      marginTop: 0
    }
  },
  ({ theme, outer, col, row }) => {
    switch (!0) {
      case !!(outer && col):
        return {
          marginLeft: outer * theme.layoutMargin,
          marginRight: outer * theme.layoutMargin
        };
      case !!(outer && row):
        return {
          marginTop: outer * theme.layoutMargin,
          marginBottom: outer * theme.layoutMargin
        };
      default:
        return {};
    }
  }
), Spaced = ({ col, row, outer, children, ...rest }) => {
  let outerAmount = toNumber(typeof outer == "number" || !outer ? outer : col || row);
  return React21.createElement(Container3, { col, row, outer: outerAmount, ...rest }, children);
};

// src/components/components/placeholder/placeholder.tsx
import React22, { Children as Children3 } from "react";
import { styled as styled35 } from "storybook/theming";
var Title2 = styled35.div(({ theme }) => ({
  fontWeight: theme.typography.weight.bold
})), Desc = styled35.div(), Message = styled35.div(({ theme }) => ({
  padding: 30,
  textAlign: "center",
  color: theme.color.defaultText,
  fontSize: theme.typography.size.s2 - 1
})), Placeholder = ({ children, ...props }) => {
  let [title, desc] = Children3.toArray(children);
  return React22.createElement(Message, { ...props }, React22.createElement(Title2, null, title), desc && React22.createElement(Desc, null, desc));
};

// src/components/components/Zoom/ZoomElement.tsx
import React23, { useCallback as useCallback7, useEffect as useEffect6, useRef as useRef5, useState as useState10 } from "react";
import { styled as styled36 } from "storybook/theming";

// ../node_modules/use-resize-observer/dist/bundle.esm.js
import { useRef as useRef4, useEffect as useEffect5, useCallback as useCallback6, useState as useState9, useMemo as useMemo3 } from "react";
function useResolvedElement(subscriber, refOrElement) {
  var lastReportRef = useRef4(null), refOrElementRef = useRef4(null);
  refOrElementRef.current = refOrElement;
  var cbElementRef = useRef4(null);
  useEffect5(function() {
    evaluateSubscription();
  });
  var evaluateSubscription = useCallback6(function() {
    var cbElement = cbElementRef.current, refOrElement2 = refOrElementRef.current, element = cbElement || (refOrElement2 ? refOrElement2 instanceof Element ? refOrElement2 : refOrElement2.current : null);
    lastReportRef.current && lastReportRef.current.element === element && lastReportRef.current.subscriber === subscriber || (lastReportRef.current && lastReportRef.current.cleanup && lastReportRef.current.cleanup(), lastReportRef.current = {
      element,
      subscriber,
      // Only calling the subscriber, if there's an actual element to report.
      // Setting cleanup to undefined unless a subscriber returns one, as an existing cleanup function would've been just called.
      cleanup: element ? subscriber(element) : void 0
    });
  }, [subscriber]);
  return useEffect5(function() {
    return function() {
      lastReportRef.current && lastReportRef.current.cleanup && (lastReportRef.current.cleanup(), lastReportRef.current = null);
    };
  }, []), useCallback6(function(element) {
    cbElementRef.current = element, evaluateSubscription();
  }, [evaluateSubscription]);
}
function extractSize(entry, boxProp, sizeType) {
  return entry[boxProp] ? entry[boxProp][0] ? entry[boxProp][0][sizeType] : (
    // TS complains about this, because the RO entry type follows the spec and does not reflect Firefox's current
    // behaviour of returning objects instead of arrays for `borderBoxSize` and `contentBoxSize`.
    // @ts-ignore
    entry[boxProp][sizeType]
  ) : boxProp === "contentBoxSize" ? entry.contentRect[sizeType === "inlineSize" ? "width" : "height"] : void 0;
}
function useResizeObserver(opts) {
  opts === void 0 && (opts = {});
  var onResize = opts.onResize, onResizeRef = useRef4(void 0);
  onResizeRef.current = onResize;
  var round = opts.round || Math.round, resizeObserverRef = useRef4(), _useState = useState9({
    width: void 0,
    height: void 0
  }), size = _useState[0], setSize = _useState[1], didUnmount = useRef4(!1);
  useEffect5(function() {
    return didUnmount.current = !1, function() {
      didUnmount.current = !0;
    };
  }, []);
  var previous = useRef4({
    width: void 0,
    height: void 0
  }), refCallback = useResolvedElement(useCallback6(function(element) {
    return (!resizeObserverRef.current || resizeObserverRef.current.box !== opts.box || resizeObserverRef.current.round !== round) && (resizeObserverRef.current = {
      box: opts.box,
      round,
      instance: new ResizeObserver(function(entries) {
        var entry = entries[0], boxProp = opts.box === "border-box" ? "borderBoxSize" : opts.box === "device-pixel-content-box" ? "devicePixelContentBoxSize" : "contentBoxSize", reportedWidth = extractSize(entry, boxProp, "inlineSize"), reportedHeight = extractSize(entry, boxProp, "blockSize"), newWidth = reportedWidth ? round(reportedWidth) : void 0, newHeight = reportedHeight ? round(reportedHeight) : void 0;
        if (previous.current.width !== newWidth || previous.current.height !== newHeight) {
          var newSize = {
            width: newWidth,
            height: newHeight
          };
          previous.current.width = newWidth, previous.current.height = newHeight, onResizeRef.current ? onResizeRef.current(newSize) : didUnmount.current || setSize(newSize);
        }
      })
    }), resizeObserverRef.current.instance.observe(element, {
      box: opts.box
    }), function() {
      resizeObserverRef.current && resizeObserverRef.current.instance.unobserve(element);
    };
  }, [opts.box, round]), opts.ref);
  return useMemo3(function() {
    return {
      ref: refCallback,
      width: size.width,
      height: size.height
    };
  }, [refCallback, size.width, size.height]);
}

// src/components/components/Zoom/ZoomElement.tsx
var ZoomElementWrapper = styled36.div(
  ({ centered = !1, scale = 1, elementHeight }) => ({
    height: elementHeight || "auto",
    transformOrigin: centered ? "center top" : "left top",
    transform: `scale(${1 / scale})`
  })
);
function ZoomElement({ centered, scale, children }) {
  let componentWrapperRef = useRef5(null), [elementHeight, setElementHeight] = useState10(0), onResize = useCallback7(
    ({ height }) => {
      height && setElementHeight(height / scale);
    },
    [scale]
  );
  return useEffect6(() => {
    componentWrapperRef.current && setElementHeight(componentWrapperRef.current.getBoundingClientRect().height);
  }, [scale]), useResizeObserver({
    ref: componentWrapperRef,
    onResize
  }), React23.createElement(ZoomElementWrapper, { centered, scale, elementHeight }, React23.createElement("div", { ref: componentWrapperRef, className: "innerZoomElementWrapper" }, children));
}

// src/components/components/Zoom/ZoomIFrame.tsx
import React24, { Component } from "react";
var ZoomIFrame = class extends Component {
  constructor() {
    super(...arguments);
    // @ts-expect-error (non strict)
    this.iframe = null;
  }
  componentDidMount() {
    let { iFrameRef } = this.props;
    this.iframe = iFrameRef.current;
  }
  shouldComponentUpdate(nextProps) {
    let { scale, active } = this.props;
    return scale !== nextProps.scale && this.setIframeInnerZoom(nextProps.scale), active !== nextProps.active && this.iframe.setAttribute("data-is-storybook", nextProps.active ? "true" : "false"), nextProps.children.props.src !== this.props.children.props.src;
  }
  setIframeInnerZoom(scale) {
    try {
      Object.assign(this.iframe.contentDocument.body.style, {
        width: `${scale * 100}%`,
        height: `${scale * 100}%`,
        transform: `scale(${1 / scale})`,
        transformOrigin: "top left"
      });
    } catch {
      this.setIframeZoom(scale);
    }
  }
  setIframeZoom(scale) {
    Object.assign(this.iframe.style, {
      width: `${scale * 100}%`,
      height: `${scale * 100}%`,
      transform: `scale(${1 / scale})`,
      transformOrigin: "top left"
    });
  }
  render() {
    let { children } = this.props;
    return React24.createElement(React24.Fragment, null, children);
  }
};

// src/components/components/Zoom/Zoom.tsx
var Zoom = {
  Element: ZoomElement,
  IFrame: ZoomIFrame
};

// src/components/components/ErrorFormatter/ErrorFormatter.tsx
import React25, { Fragment as Fragment3 } from "react";
import { global } from "@storybook/global";
import { styled as styled37 } from "storybook/theming";
var { document: document2 } = global, ErrorName = styled37.strong(({ theme }) => ({
  color: theme.color.orange
})), ErrorImportant = styled37.strong(({ theme }) => ({
  color: theme.color.ancillary,
  textDecoration: "underline"
})), ErrorDetail = styled37.em(({ theme }) => ({
  color: theme.textMutedColor
})), firstLineRegex = /(Error): (.*)\n/, linesRegexChromium = /at (?:(.*) )?\(?(.+)\)?/, linesRegexFirefox = /([^@]+)?(?:\/<)?@(.+)?/, linesRegexSafari = /([^@]+)?@(.+)?/, ErrorFormatter = ({ error }) => {
  if (!error)
    return React25.createElement(Fragment3, null, "This error has no stack or message");
  if (!error.stack)
    return React25.createElement(Fragment3, null, error.message || "This error has no stack or message");
  let input = error.stack.toString();
  input && error.message && !input.includes(error.message) && (input = `Error: ${error.message}

${input}`);
  let match = input.match(firstLineRegex);
  if (!match)
    return React25.createElement(Fragment3, null, input);
  let [, type, name] = match, rawLines = input.split(/\n/).slice(1), [, ...lines] = rawLines.map((line) => {
    let result = line.match(linesRegexChromium) || line.match(linesRegexFirefox) || line.match(linesRegexSafari);
    return result ? {
      name: (result[1] || "").replace("/<", ""),
      location: result[2].replace(document2.location.origin, "")
    } : null;
  }).filter(Boolean);
  return React25.createElement(Fragment3, null, React25.createElement("span", null, type), ": ", React25.createElement(ErrorName, null, name), React25.createElement("br", null), lines.map(
    (l, i) => l?.name ? React25.createElement(Fragment3, { key: i }, "  ", "at ", React25.createElement(ErrorImportant, null, l.name), " (", React25.createElement(ErrorDetail, null, l.location), ")", React25.createElement("br", null)) : React25.createElement(Fragment3, { key: i }, "  ", "at ", React25.createElement(ErrorDetail, null, l?.location), React25.createElement("br", null))
  ));
};

// src/components/components/Select/Select.tsx
import React37, { forwardRef as forwardRef12, useCallback as useCallback8, useEffect as useEffect7, useMemo as useMemo4, useRef as useRef7, useState as useState11 } from "react";
import { RefreshIcon } from "@storybook/icons";
import { styled as styled48, useTheme } from "storybook/theming";

// src/components/components/Form/Form.tsx
import { styled as styled44 } from "storybook/theming";

// src/components/components/Form/Checkbox.tsx
import React26 from "react";
import { color, styled as styled38 } from "storybook/theming";
var Input = styled38.input(({ theme }) => ({
  appearance: "none",
  backgroundColor: theme.input.background,
  border: `1px solid ${theme.base === "dark" ? "hsl(0 0 100 / 0.4)" : "hsl(0 0 0 / 0.44)"}`,
  borderRadius: 2,
  display: "grid",
  flexShrink: 0,
  height: 14,
  margin: 0,
  placeContent: "center",
  transition: "background-color 0.1s",
  width: 14,
  "&:enabled": {
    cursor: "pointer"
  },
  "&:disabled": {
    backgroundColor: "transparent",
    borderColor: theme.input.border
  },
  "&:disabled:checked, &:disabled:indeterminate": {
    backgroundColor: theme.base === "dark" ? color.dark : theme.color.mediumdark
  },
  "&:checked, &:indeterminate": {
    border: "none",
    backgroundColor: color.secondary
  },
  "&:checked::before": {
    content: '""',
    width: 14,
    height: 14,
    background: `no-repeat center url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14'%3E%3Cpath fill='none' stroke='%23fff' stroke-width='2' d='m3 7 2.5 2.5L11 4'/%3E%3C/svg%3E")`
  },
  "&:indeterminate::before": {
    content: '""',
    width: 8,
    height: 2,
    background: "white"
  },
  "&:enabled:focus-visible": {
    outline: `2px solid ${theme.color.secondary}`,
    outlineOffset: 2
  }
})), Checkbox = (props) => React26.createElement(Input, { ...props, type: "checkbox" });

// src/components/components/Form/Field.tsx
import React27 from "react";
import { styled as styled39 } from "storybook/theming";
var Wrapper = styled39.label(({ theme }) => ({
  display: "flex",
  borderBottom: `1px solid ${theme.appBorderColor}`,
  margin: "0 15px",
  padding: "8px 0",
  "&:last-child": {
    marginBottom: "3rem"
  }
})), Label = styled39.span(({ theme }) => ({
  minWidth: 100,
  fontWeight: theme.typography.weight.bold,
  marginRight: 15,
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
  lineHeight: "16px"
})), Field = ({ label, children, ...props }) => React27.createElement(Wrapper, { ...props }, label ? React27.createElement(Label, null, React27.createElement("span", null, label)) : null, children);

// src/components/components/Form/Input.tsx
import React28 from "react";
import { forwardRef as forwardRef8 } from "react";
import { styled as styled40 } from "storybook/theming";

// src/components/components/Form/styles.ts
var sizes = (({ size }) => {
  switch (size) {
    case "100%":
      return { width: "100%" };
    case "flex":
      return { flex: 1 };
    case "auto":
    default:
      return { display: "inline" };
  }
}), alignment = (({
  align
}) => {
  switch (align) {
    case "end":
      return { textAlign: "right" };
    case "center":
      return { textAlign: "center" };
    case "start":
    default:
      return { textAlign: "left" };
  }
}), validation = (({
  valid,
  theme
}) => {
  switch (valid) {
    case "valid":
      return { boxShadow: `${theme.color.positive} 0 0 0 1px inset !important` };
    case "error":
      return { boxShadow: `${theme.color.negative} 0 0 0 1px inset !important` };
    case "warn":
      return {
        boxShadow: `${theme.color.warning} 0 0 0 1px inset`
      };
    case void 0:
    case null:
    default:
      return {};
  }
}), styleResets = {
  // resets
  appearance: "none",
  border: "0 none",
  boxSizing: "inherit",
  display: " block",
  margin: " 0",
  background: "transparent",
  padding: 0,
  fontSize: "inherit",
  position: "relative"
}, styles = (({ theme }) => ({
  ...styleResets,
  transition: "box-shadow 200ms ease-out, opacity 200ms ease-out",
  color: theme.input.color || "inherit",
  background: theme.input.background,
  boxShadow: `${theme.input.border} 0 0 0 1px inset`,
  borderRadius: theme.input.borderRadius,
  fontSize: theme.typography.size.s2 - 1,
  lineHeight: "20px",
  padding: "6px 10px",
  // 32
  boxSizing: "border-box",
  height: 32,
  '&[type="file"]': {
    height: "auto"
  },
  "&:focus": {
    boxShadow: `${theme.color.secondary} 0 0 0 1px inset`,
    outline: "none",
    "@media (forced-colors: active)": {
      outline: "1px solid highlight"
    }
  },
  "&[disabled]": {
    background: theme.base === "light" ? theme.color.lighter : "transparent"
  },
  "&:-webkit-autofill": { WebkitBoxShadow: `0 0 0 3em ${theme.color.lightest} inset` },
  "&::placeholder": {
    color: theme.textMutedColor,
    opacity: 1
  }
}));

// src/components/components/Form/Input.tsx
var Input2 = Object.assign(
  styled40(
    forwardRef8(function({ size, valid, align, ...props }, ref) {
      return React28.createElement("input", { ...props, ref });
    })
  )(styles, sizes, alignment, validation, {
    minHeight: 32
  }),
  {
    displayName: "Input"
  }
);

// src/components/components/Form/Radio.tsx
import React29 from "react";
import { color as color2, styled as styled41 } from "storybook/theming";
var Input4 = styled41.input(({ theme }) => ({
  appearance: "none",
  backgroundColor: theme.input.background,
  border: `1px solid ${theme.base === "dark" ? "hsl(0 0 100 / 0.4)" : "hsl(0 0 0 / 0.44)"}`,
  borderRadius: 8,
  display: "grid",
  flexShrink: 0,
  height: 16,
  margin: -1,
  placeContent: "center",
  transition: "background-color 0.1s",
  width: 16,
  "&:enabled": {
    cursor: "pointer"
  },
  "&:disabled": {
    backgroundColor: "transparent",
    borderColor: theme.input.border
  },
  "&:disabled:checked": {
    backgroundColor: theme.base === "dark" ? color2.dark : theme.color.mediumdark,
    borderColor: theme.base === "dark" ? color2.dark : theme.color.mediumdark
  },
  "&:checked": {
    backgroundColor: color2.secondary,
    borderColor: color2.secondary,
    boxShadow: `inset 0 0 0 2px ${theme.input.background}`
  },
  "&:enabled:focus-visible": {
    outline: `2px solid ${theme.color.secondary}`,
    outlineOffset: 2
  }
})), Radio = (props) => React29.createElement(Input4, { ...props, type: "radio" });

// src/components/components/Form/Select.tsx
import React30 from "react";
import { lighten, styled as styled42 } from "storybook/theming";
var BaseSelect = styled42.select(sizes, ({ theme }) => ({
  appearance: "none",
  background: `calc(100% - 12px) center no-repeat url("data:image/svg+xml,%3Csvg width='8' height='4' viewBox='0 0 8 4' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1.30303 0.196815C1.13566 0.0294472 0.864304 0.0294472 0.696937 0.196815C0.529569 0.364182 0.529569 0.635539 0.696937 0.802906L3.69694 3.80291C3.8643 3.97027 4.13566 3.97027 4.30303 3.80291L7.30303 0.802906C7.4704 0.635539 7.4704 0.364182 7.30303 0.196815C7.13566 0.0294473 6.8643 0.0294473 6.69694 0.196815L3.99998 2.89377L1.30303 0.196815Z' fill='%2373828C'/%3E%3C/svg%3E%0A")`,
  backgroundSize: 10,
  padding: "6px 30px 6px 10px",
  "@supports (appearance: base-select)": {
    appearance: "base-select",
    background: theme.input.background,
    padding: "6px 10px"
  },
  transition: "box-shadow 200ms ease-out, opacity 200ms ease-out",
  color: theme.input.color || "inherit",
  boxShadow: `${theme.input.border} 0 0 0 1px inset`,
  borderRadius: theme.input.borderRadius,
  fontSize: theme.typography.size.s2 - 1,
  lineHeight: "20px",
  boxSizing: "border-box",
  border: "none",
  cursor: "pointer",
  "& > button": {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 8,
    "& > svg": {
      width: 14,
      height: 14,
      color: theme.textMutedColor
    }
  },
  "&:has(option:not([hidden]):checked)": {
    color: theme.color.defaultText
  },
  "&:focus-visible, &:focus-within": {
    outline: "none",
    boxShadow: `${theme.color.secondary} 0 0 0 1px inset`
  },
  "&::picker-icon": {
    display: "none"
  },
  "&::picker(select)": {
    appearance: "base-select",
    border: "1px solid #e4e4e7",
    padding: 4,
    marginTop: 4,
    background: theme.base === "light" ? lighten(theme.background.app) : theme.background.app,
    filter: `
      drop-shadow(0 5px 5px rgba(0,0,0,0.05))
      drop-shadow(0 0 3px rgba(0,0,0,0.1))
    `,
    borderRadius: theme.appBorderRadius + 2,
    fontSize: theme.typography.size.s1,
    cursor: "default",
    transition: "opacity 100ms ease-in-out, transform 100ms ease-in-out",
    transformOrigin: "top",
    transform: "translateY(0)",
    opacity: 1,
    "@starting-style": {
      transform: "translateY(-0.25rem) scale(0.95)",
      opacity: 0
    }
  },
  "& optgroup label": {
    display: "block",
    padding: "3px 6px"
  },
  "& option": {
    lineHeight: "18px",
    padding: "7px 10px",
    borderRadius: 4,
    outline: "none",
    cursor: "pointer",
    color: theme.color.defaultText,
    "&::checkmark": {
      display: "none"
    },
    "&:hover, &:focus-visible": {
      backgroundColor: theme.background.hoverable
    },
    "&:checked": {
      color: theme.color.secondary,
      fontWeight: theme.typography.weight.bold
    },
    "&:disabled": {
      backgroundColor: "transparent",
      cursor: "default",
      color: theme.color.defaultText
    }
  }
})), Select = ({ children, ...props }) => (
  // @ts-expect-error Weird props mismatch
  React30.createElement(BaseSelect, { ...props }, !isTestEnvironment() && React30.createElement("button", null, React30.createElement("selectedcontent", null), React30.createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true"
    },
    React30.createElement("path", { d: "m6 9 6 6 6-6" })
  )), React30.createElement("optgroup", null, children))
);

// src/components/components/Form/Textarea.tsx
import React34, { forwardRef as forwardRef10 } from "react";

// ../node_modules/react-textarea-autosize/dist/react-textarea-autosize.browser.esm.js
import * as React33 from "react";

// ../node_modules/use-latest/dist/use-latest.esm.js
import React31 from "react";

// ../node_modules/use-isomorphic-layout-effect/dist/use-isomorphic-layout-effect.browser.esm.js
import { useLayoutEffect } from "react";
var index = useLayoutEffect;

// ../node_modules/use-latest/dist/use-latest.esm.js
var useLatest = function(value) {
  var ref = React31.useRef(value);
  return index(function() {
    ref.current = value;
  }), ref;
};

// ../node_modules/use-composed-ref/dist/use-composed-ref.esm.js
import React32 from "react";
var updateRef = function(ref, value) {
  if (typeof ref == "function") {
    ref(value);
    return;
  }
  ref.current = value;
}, useComposedRef = function(libRef, userRef) {
  var prevUserRef = React32.useRef();
  return React32.useCallback(function(instance) {
    libRef.current = instance, prevUserRef.current && updateRef(prevUserRef.current, null), prevUserRef.current = userRef, userRef && updateRef(userRef, instance);
  }, [userRef]);
};

// ../node_modules/react-textarea-autosize/dist/react-textarea-autosize.browser.esm.js
var HIDDEN_TEXTAREA_STYLE = {
  "min-height": "0",
  "max-height": "none",
  height: "0",
  visibility: "hidden",
  overflow: "hidden",
  position: "absolute",
  "z-index": "-1000",
  top: "0",
  right: "0",
  display: "block"
}, forceHiddenStyles = function(node) {
  Object.keys(HIDDEN_TEXTAREA_STYLE).forEach(function(key) {
    node.style.setProperty(key, HIDDEN_TEXTAREA_STYLE[key], "important");
  });
}, forceHiddenStyles$1 = forceHiddenStyles, hiddenTextarea = null, getHeight = function(node, sizingData) {
  var height = node.scrollHeight;
  return sizingData.sizingStyle.boxSizing === "border-box" ? height + sizingData.borderSize : height - sizingData.paddingSize;
};
function calculateNodeHeight(sizingData, value, minRows, maxRows) {
  minRows === void 0 && (minRows = 1), maxRows === void 0 && (maxRows = 1 / 0), hiddenTextarea || (hiddenTextarea = document.createElement("textarea"), hiddenTextarea.setAttribute("tabindex", "-1"), hiddenTextarea.setAttribute("aria-hidden", "true"), forceHiddenStyles$1(hiddenTextarea)), hiddenTextarea.parentNode === null && document.body.appendChild(hiddenTextarea);
  var paddingSize = sizingData.paddingSize, borderSize = sizingData.borderSize, sizingStyle = sizingData.sizingStyle, boxSizing = sizingStyle.boxSizing;
  Object.keys(sizingStyle).forEach(function(_key) {
    var key = _key;
    hiddenTextarea.style[key] = sizingStyle[key];
  }), forceHiddenStyles$1(hiddenTextarea), hiddenTextarea.value = value;
  var height = getHeight(hiddenTextarea, sizingData);
  hiddenTextarea.value = value, height = getHeight(hiddenTextarea, sizingData), hiddenTextarea.value = "x";
  var rowHeight = hiddenTextarea.scrollHeight - paddingSize, minHeight = rowHeight * minRows;
  boxSizing === "border-box" && (minHeight = minHeight + paddingSize + borderSize), height = Math.max(minHeight, height);
  var maxHeight = rowHeight * maxRows;
  return boxSizing === "border-box" && (maxHeight = maxHeight + paddingSize + borderSize), height = Math.min(maxHeight, height), [height, rowHeight];
}
var noop = function() {
}, pick = function(props, obj) {
  return props.reduce(function(acc, prop) {
    return acc[prop] = obj[prop], acc;
  }, {});
}, SIZING_STYLE = [
  "borderBottomWidth",
  "borderLeftWidth",
  "borderRightWidth",
  "borderTopWidth",
  "boxSizing",
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  // non-standard
  "tabSize",
  "textIndent",
  // non-standard
  "textRendering",
  "textTransform",
  "width",
  "wordBreak",
  "wordSpacing",
  "scrollbarGutter"
], isIE = !!document.documentElement.currentStyle, getSizingData = function(node) {
  var style = window.getComputedStyle(node);
  if (style === null)
    return null;
  var sizingStyle = pick(SIZING_STYLE, style), boxSizing = sizingStyle.boxSizing;
  if (boxSizing === "")
    return null;
  isIE && boxSizing === "border-box" && (sizingStyle.width = parseFloat(sizingStyle.width) + parseFloat(sizingStyle.borderRightWidth) + parseFloat(sizingStyle.borderLeftWidth) + parseFloat(sizingStyle.paddingRight) + parseFloat(sizingStyle.paddingLeft) + "px");
  var paddingSize = parseFloat(sizingStyle.paddingBottom) + parseFloat(sizingStyle.paddingTop), borderSize = parseFloat(sizingStyle.borderBottomWidth) + parseFloat(sizingStyle.borderTopWidth);
  return {
    sizingStyle,
    paddingSize,
    borderSize
  };
}, getSizingData$1 = getSizingData;
function useListener(target, type, listener) {
  var latestListener = useLatest(listener);
  React33.useLayoutEffect(function() {
    var handler = function(ev) {
      return latestListener.current(ev);
    };
    if (target)
      return target.addEventListener(type, handler), function() {
        return target.removeEventListener(type, handler);
      };
  }, []);
}
var useFormResetListener = function(libRef, listener) {
  useListener(document.body, "reset", function(ev) {
    libRef.current.form === ev.target && listener(ev);
  });
}, useWindowResizeListener = function(listener) {
  useListener(window, "resize", listener);
}, useFontsLoadedListener = function(listener) {
  useListener(document.fonts, "loadingdone", listener);
}, _excluded = ["cacheMeasurements", "maxRows", "minRows", "onChange", "onHeightChange"], TextareaAutosize = function(_ref, userRef) {
  var cacheMeasurements = _ref.cacheMeasurements, maxRows = _ref.maxRows, minRows = _ref.minRows, _ref$onChange = _ref.onChange, onChange = _ref$onChange === void 0 ? noop : _ref$onChange, _ref$onHeightChange = _ref.onHeightChange, onHeightChange = _ref$onHeightChange === void 0 ? noop : _ref$onHeightChange, props = _objectWithoutPropertiesLoose(_ref, _excluded), isControlled = props.value !== void 0, libRef = React33.useRef(null), ref = useComposedRef(libRef, userRef), heightRef = React33.useRef(0), measurementsCacheRef = React33.useRef(), resizeTextarea = function() {
    var node = libRef.current, nodeSizingData = cacheMeasurements && measurementsCacheRef.current ? measurementsCacheRef.current : getSizingData$1(node);
    if (nodeSizingData) {
      measurementsCacheRef.current = nodeSizingData;
      var _calculateNodeHeight = calculateNodeHeight(nodeSizingData, node.value || node.placeholder || "x", minRows, maxRows), height = _calculateNodeHeight[0], rowHeight = _calculateNodeHeight[1];
      heightRef.current !== height && (heightRef.current = height, node.style.setProperty("height", height + "px", "important"), onHeightChange(height, {
        rowHeight
      }));
    }
  }, handleChange = function(event) {
    isControlled || resizeTextarea(), onChange(event);
  };
  return React33.useLayoutEffect(resizeTextarea), useFormResetListener(libRef, function() {
    if (!isControlled) {
      var currentValue = libRef.current.value;
      requestAnimationFrame(function() {
        var node = libRef.current;
        node && currentValue !== node.value && resizeTextarea();
      });
    }
  }), useWindowResizeListener(resizeTextarea), useFontsLoadedListener(resizeTextarea), React33.createElement("textarea", _extends({}, props, {
    onChange: handleChange,
    ref
  }));
}, index2 = React33.forwardRef(TextareaAutosize);

// src/components/components/Form/Textarea.tsx
import { styled as styled43 } from "storybook/theming";
var Textarea = Object.assign(
  styled43(
    forwardRef10(function({ size, valid, align, ...props }, ref) {
      return React34.createElement(index2, { ...props, ref });
    })
  )(styles, sizes, alignment, validation, ({ height = 400 }) => ({
    overflow: "visible",
    maxHeight: height
  })),
  {
    displayName: "Textarea"
  }
);

// src/components/components/Form/Form.tsx
var Form = Object.assign(
  styled44.form({
    boxSizing: "border-box",
    width: "100%"
  }),
  {
    Field,
    Input: Input2,
    Select,
    Textarea,
    Button,
    Checkbox,
    Radio
  }
);

// src/components/components/Popover/Popover.tsx
import React35, { forwardRef as forwardRef11 } from "react";
import { CloseIcon } from "@storybook/icons";
import { lighten as lighten2, styled as styled45 } from "storybook/theming";
var Wrapper2 = styled45.div(
  ({ hasCloseButton, padding }) => ({
    display: "inline-block",
    position: "relative",
    minHeight: hasCloseButton ? 36 : void 0,
    zIndex: 2147483647,
    colorScheme: "light dark",
    padding
  }),
  ({ theme, hasChrome }) => hasChrome ? {
    filter: `
            drop-shadow(0px 5px 5px rgba(0,0,0,0.05))
            drop-shadow(0 1px 3px rgba(0,0,0,0.1))
          `,
    borderRadius: theme.appBorderRadius + 2,
    fontSize: theme.typography.size.s1
  } : {},
  ({ theme, bgColor }) => bgColor === "default" && {
    background: theme.base === "light" ? lighten2(theme.background.app) : theme.background.app,
    color: theme.color.defaultText
  },
  ({ theme, bgColor }) => bgColor === "inverse" && {
    background: theme.base === "light" ? theme.color.darkest : theme.color.lightest,
    color: theme.color.inverseText
  },
  ({ theme, bgColor }) => (bgColor === "positive" || bgColor === "negative" || bgColor === "warning") && {
    background: theme.background[bgColor],
    color: theme.color[`${bgColor}Text`]
  }
), AbsoluteButton = styled45(Button)({
  position: "absolute",
  top: 4,
  right: 4
}), Popover = forwardRef11(
  ({
    children,
    color: color4 = "default",
    hasChrome = !0,
    hideLabel = "Close",
    onHide,
    padding = 8,
    ...props
  }, ref) => React35.createElement(
    Wrapper2,
    {
      bgColor: color4,
      hasChrome,
      hasCloseButton: !!onHide,
      padding,
      ref,
      ...props
    },
    children,
    onHide && React35.createElement(
      AbsoluteButton,
      {
        ariaLabel: hideLabel,
        onClick: onHide,
        padding: "small",
        variant: "ghost",
        size: "small"
      },
      React35.createElement(CloseIcon, null)
    )
  )
);
Popover.displayName = "Popover";

// src/components/components/Select/SelectOption.tsx
import React36 from "react";
import { styled as styled46 } from "storybook/theming";
var Item = styled46("li")(({ theme }) => ({
  padding: "6px 12px",
  fontSize: 12,
  lineHeight: 1.5,
  background: "transparent",
  color: theme.color.defaultText,
  cursor: "pointer",
  borderRadius: 4,
  '&[aria-disabled="true"]': {
    opacity: 0.5,
    cursor: "not-allowed"
  },
  '&[aria-selected="true"]': {
    color: theme.base === "light" ? curriedDarken$1(0.1, theme.color.secondary) : theme.color.secondary,
    fontWeight: theme.typography.weight.bold
  },
  ":hover": {
    background: curriedTransparentize$1(0.93, theme.color.secondary)
  },
  ":focus-visible": {
    background: theme.background.hoverable,
    outline: `2px solid ${theme.barSelectedColor}`,
    outlineOffset: 1,
    borderRadius: 2
  },
  display: "flex",
  alignItems: "flex-start",
  gap: 8
})), Row2 = styled46("div")({
  display: "flex",
  flexDirection: "row",
  gap: 4,
  alignItems: "center"
}), Col2 = styled46("div")({
  display: "flex",
  flexDirection: "column",
  flexGrow: 1
}), Icon = styled46("span")(() => ({
  display: "block",
  height: "1rem",
  width: "1rem"
})), Title3 = styled46("span")(({}) => ({})), Description2 = styled46("span")(({ theme }) => ({
  fontSize: 11,
  color: theme.textMutedColor
})), SelectOption = ({
  id,
  title,
  description,
  icon,
  children,
  isSelected,
  isActive,
  onClick,
  onFocus,
  onKeyDown,
  shouldLookDisabled = !1,
  ...props
}) => React36.createElement(
  Item,
  {
    ...props,
    id,
    role: "option",
    tabIndex: isActive ? 0 : -1,
    "aria-selected": isSelected,
    "aria-disabled": shouldLookDisabled ? !0 : void 0,
    onClick,
    onFocus,
    onKeyDown
  },
  children ?? React36.createElement(Row2, null, icon && React36.createElement(Icon, null, icon), React36.createElement(Col2, null, React36.createElement(Title3, null, title), description && React36.createElement(Description2, null, description)))
);
SelectOption.displayName = "SelectOption";

// src/components/components/Select/helpers.tsx
import { styled as styled47 } from "storybook/theming";
var PAGE_STEP_SIZE = 5, UNDEFINED_VALUE = Symbol.for("undefined");
function isLiteralValue(value) {
  return value == null || typeof value == "string" || typeof value == "number" || typeof value == "boolean" || typeof value == "symbol";
}
function optionToInternal(option) {
  return {
    ...option,
    type: "option",
    value: externalToValue(option.value)
  };
}
function optionOrResetToInternal(option) {
  return "type" in option && option.type === "reset" ? option : optionToInternal(option);
}
function valueToExternal(value) {
  if (value !== UNDEFINED_VALUE)
    return value;
}
function externalToValue(value) {
  return value === void 0 ? UNDEFINED_VALUE : value;
}
var Listbox = styled47("ul")({
  minWidth: 180,
  height: "100%",
  borderRadius: 6,
  overflow: "hidden auto",
  listStyle: "none",
  margin: 0,
  padding: 4
});

// src/components/components/Select/Select.tsx
function valueToId(parentId, { value }) {
  return `${parentId}-opt-${String(value) ?? "sb-reset"}`;
}
var SelectedOptionCount = styled48.span(({ theme }) => ({
  appearance: "none",
  color: theme.textMutedColor,
  fontSize: 12
}));
function setSelectedFromDefault(options, defaultOptions) {
  return defaultOptions === void 0 ? [] : isLiteralValue(defaultOptions) ? options.filter((opt) => opt.value === defaultOptions).map(optionToInternal) : options.filter((opt) => defaultOptions.some((def) => opt.value === def)).map(optionToInternal);
}
var StyledButton3 = styled48(Button)(
  ({ $isOpen: isOpen, $hasSelection: hasSelection, theme }) => isOpen || hasSelection ? {
    boxShadow: "none",
    background: curriedTransparentize$1(0.93, theme.barSelectedColor),
    color: theme.base === "light" ? curriedDarken$1(0.1, theme.color.secondary) : theme.color.secondary
  } : {}
), Underlay = styled48.div({
  position: "fixed",
  inset: 0,
  // This will do for now, our popovers use the max z-index of 2147483647. We'll want to
  // inherit a base from a CSS variable and add preset values to it in the future (e.g.
  // 100 for underlay, 200 for overlay) if we start using Select in dialogs.
  zIndex: 1e3
}), MinimalistPopover = ({ children, handleClose, triggerRef }) => {
  let popoverRef = React37.useRef(null);
  $e0b6e0b68ec7f50f$export$872b660ac5a1ff98({
    ref: popoverRef,
    onInteractOutside: handleClose
  }), useEffect7(() => {
    if (popoverRef.current)
      return $5e3802645cc19319$export$1c3ebcada18427bf([popoverRef.current], { shouldUseInert: !0 });
  }, []);
  let { overlayProps: positionProps } = $2a41e45df1593e64$export$d39e1813b3bdd0e1({
    targetRef: triggerRef,
    overlayRef: popoverRef,
    placement: "bottom start",
    offset: 8,
    maxHeight: 504,
    isOpen: !0
  }), { overlayProps, underlayProps } = $a11501f3d1d39e6c$export$ea8f71083e90600f(
    {
      isOpen: !0,
      onClose: handleClose,
      isDismissable: !0,
      /* We do this ourselves. */
      shouldCloseOnBlur: !1,
      /* We also do this ourselves. */
      isKeyboardDismissDisabled: !0
    },
    popoverRef
  ), theme = useTheme();
  return positionProps.style = {
    ...positionProps.style,
    overflow: "hidden auto",
    scrollbarColor: `${theme.barTextColor} transparent`,
    scrollbarWidth: "thin"
  }, React37.createElement($337b884510726a0d$export$c6fdb837b070b4ff, { disableFocusManagement: !0, ...overlayProps }, React37.createElement(Underlay, { ...underlayProps }), React37.createElement(Popover, { hasChrome: !0, ref: popoverRef, padding: 0, ...positionProps }, children));
}, Select2 = forwardRef12(
  ({
    children,
    icon,
    disabled = !1,
    options: calleeOptions,
    defaultOptions,
    multiSelect = !1,
    onReset,
    padding = "small",
    resetLabel,
    onSelect,
    onDeselect,
    onChange,
    tooltip,
    ariaLabel,
    ...props
  }, ref) => {
    let [isOpen, setIsOpen] = useState11(props.defaultOpen || !1), triggerRef = $df56164dff5785e2$export$4338b53315abf666(ref), id = useMemo4(() => "select-" + Math.random().toString(36).substring(2, 15), []), listboxId = `${id}-listbox`, listboxRef = useRef7(null), otState = $fc909762b330b746$export$61c6a8c84e605fb6({
      isOpen: isOpen && !disabled,
      onOpenChange: setIsOpen
    }), handleClose = useCallback8(() => {
      setIsOpen(!1), triggerRef.current?.focus();
    }, [triggerRef]), [selectedOptions, setSelectedOptions] = useState11(
      setSelectedFromDefault(calleeOptions, defaultOptions)
    ), handleSelectOption = useCallback8(
      (option) => {
        option.type === "reset" ? selectedOptions.length && (onChange?.([]), onReset?.(), setSelectedOptions([])) : setSelectedOptions(multiSelect ? (previous) => {
          let newSelected = [];
          return previous?.some((opt) => opt.value === option.value) ? (onDeselect?.(valueToExternal(option.value)), newSelected = previous?.filter((opt) => opt.value !== option.value) ?? []) : (onSelect?.(valueToExternal(option.value)), newSelected = [...previous ?? [], option]), onChange?.(newSelected.map((opt) => valueToExternal(opt.value))), newSelected;
        } : (current) => current.every((opt) => opt.value !== option.value) ? (onSelect?.(valueToExternal(option.value)), onChange?.([valueToExternal(option.value)]), [option]) : current);
      },
      [multiSelect, onChange, onSelect, onDeselect, onReset, selectedOptions]
    ), resetOption = useMemo4(
      () => onReset ? {
        type: "reset",
        value: void 0,
        title: resetLabel ?? "Reset selection",
        icon: React37.createElement(RefreshIcon, null),
        description: void 0,
        children: void 0
      } : void 0,
      [onReset, resetLabel]
    ), options = useMemo4(
      () => resetOption ? [resetOption, ...calleeOptions] : calleeOptions,
      [calleeOptions, resetOption]
    );
    useEffect7(() => {
      defaultOptions && setSelectedOptions(setSelectedFromDefault(calleeOptions, defaultOptions));
    }, [defaultOptions, calleeOptions]);
    let [activeOption, setActiveOptionState] = useState11(
      void 0
    ), setActiveOption = useCallback8(
      (option) => {
        setActiveOptionState(optionOrResetToInternal(option)), multiSelect || handleSelectOption(optionOrResetToInternal(option));
      },
      [multiSelect, handleSelectOption]
    ), moveActiveOptionDown = useCallback8(
      (step = 1) => {
        if (!isOpen || !activeOption) {
          setActiveOption(options[step === 1 ? 0 : Math.min(step, options.length - 1)]);
          return;
        }
        let currentIndex = options.findIndex(
          (option) => activeOption.type === "reset" ? "type" in option && option.type === "reset" : externalToValue(option.value) === activeOption.value
        ), nextIndex = currentIndex + step, newActiveOption;
        nextIndex >= options.length && currentIndex === options.length - 1 ? newActiveOption = options[0] : newActiveOption = options[Math.min(options.length - 1, nextIndex)], setActiveOption(newActiveOption);
      },
      [isOpen, activeOption, setActiveOption, options]
    ), moveActiveOptionUp = useCallback8(
      (step = 1) => {
        if (!isOpen || !activeOption) {
          setActiveOption(options[Math.max(0, options.length - step)]);
          return;
        }
        let currentIndex = options.findIndex(
          (option) => activeOption.type === "reset" ? "type" in option && option.type === "reset" : externalToValue(option.value) === activeOption.value
        ), nextIndex = currentIndex - step, newActiveOption;
        nextIndex < 0 && currentIndex === 0 ? newActiveOption = options[options.length - 1] : newActiveOption = options[Math.max(0, nextIndex)], setActiveOption(newActiveOption);
      },
      [isOpen, activeOption, setActiveOption, options]
    ), handleButtonKeyDown = useCallback8(
      (e) => {
        let openAt = (index3) => {
          e.preventDefault(), setActiveOption(options[index3]), setIsOpen(!0);
        }, indexOfFirstSelected = options.findIndex(
          (option) => selectedOptions.some((sel) => sel.value === externalToValue(option.value))
        ), hasSelection = indexOfFirstSelected !== -1, listStart = resetOption && !hasSelection ? 1 : 0, listEnd = options.length - 1;
        e.key === "Enter" || e.key === " " ? openAt(hasSelection ? Math.min(indexOfFirstSelected, listEnd) : listStart) : e.key === "ArrowDown" ? openAt(hasSelection ? Math.min(indexOfFirstSelected + 1, listEnd) : listStart) : e.key === "ArrowUp" ? openAt(hasSelection ? Math.max(indexOfFirstSelected - 1, listStart) : listEnd) : e.key === "Home" ? openAt(listStart) : e.key === "End" ? openAt(listEnd) : e.key === "PageDown" ? openAt(
          Math.min((hasSelection ? indexOfFirstSelected : listStart) + PAGE_STEP_SIZE, listEnd)
        ) : e.key === "PageUp" && openAt(Math.max(0, (hasSelection ? indexOfFirstSelected : listEnd) - PAGE_STEP_SIZE));
      },
      [options, resetOption, setActiveOption, selectedOptions]
    ), handleListboxKeyDown = useCallback8(
      (e) => {
        e.key !== "Tab" ? e.preventDefault() : handleClose(), e.key === "Escape" ? handleClose() : e.key === "ArrowDown" ? moveActiveOptionDown() : e.key === "ArrowUp" ? moveActiveOptionUp() : e.key === "Home" ? setActiveOption(options[0]) : e.key === "End" ? setActiveOption(options[options.length - 1]) : e.key === "PageDown" ? moveActiveOptionDown(PAGE_STEP_SIZE) : e.key === "PageUp" && moveActiveOptionUp(PAGE_STEP_SIZE);
      },
      [handleClose, moveActiveOptionDown, moveActiveOptionUp, options, setActiveOption]
    );
    useEffect7(() => {
      if (isOpen && activeOption) {
        let optionElement = document.getElementById(valueToId(id, activeOption));
        optionElement && (optionElement.scrollIntoView({ block: "nearest" }), optionElement.focus());
      } else isOpen && listboxRef.current?.focus();
    }, [isOpen, activeOption, id]);
    let finalAriaLabel = useMemo4(() => selectedOptions.length === 1 ? `${ariaLabel} ${selectedOptions[0].title}` : selectedOptions.length ? `${ariaLabel}, ${selectedOptions.length} values selected` : ariaLabel, [ariaLabel, selectedOptions]);
    return React37.createElement(React37.Fragment, null, React37.createElement(
      StyledButton3,
      {
        ...props,
        variant: "ghost",
        ariaLabel: finalAriaLabel,
        tooltip: tooltip ?? ariaLabel,
        disableAllTooltips: isOpen,
        id,
        ref: triggerRef,
        padding,
        $isOpen: isOpen,
        $hasSelection: !!selectedOptions.length,
        "aria-disabled": disabled,
        disabled,
        onClick: () => {
          isOpen ? handleClose() : setIsOpen(!0);
        },
        tabIndex: isOpen ? -1 : 0,
        onKeyDown: handleButtonKeyDown,
        role: "button",
        "aria-controls": isOpen ? listboxId : void 0,
        "aria-expanded": isOpen,
        "aria-haspopup": "listbox"
      },
      !multiSelect && React37.createElement(React37.Fragment, null, icon, selectedOptions[0]?.title ?? children),
      multiSelect && React37.createElement(React37.Fragment, null, icon, children, !!selectedOptions.length && React37.createElement(
        SelectedOptionCount,
        {
          "aria-label": `${selectedOptions.length} ${selectedOptions.length > 1 ? "items" : "item"} selected`
        },
        selectedOptions?.length
      ))
    ), otState.isOpen && React37.createElement(MinimalistPopover, { handleClose, triggerRef }, React37.createElement(
      Listbox,
      {
        "aria-label": ariaLabel,
        role: "listbox",
        id: listboxId,
        ref: listboxRef,
        "aria-multiselectable": multiSelect,
        onKeyDown: handleListboxKeyDown,
        tabIndex: isOpen ? 0 : -1
      },
      options.map((opt) => ({
        option: optionOrResetToInternal(opt),
        externalOption: opt
      })).map(({ externalOption, option }) => {
        let isSelected = selectedOptions?.some((sel) => sel.value === option.value) && option !== resetOption, isReset = option === resetOption;
        return React37.createElement(
          SelectOption,
          {
            key: option.value === void 0 ? "sb-reset" : String(option.value),
            title: option.title,
            description: option.description,
            icon: !isReset && multiSelect ? (
              // Purely decorative.
              React37.createElement(Form.Checkbox, { checked: isSelected, hidden: !0, role: "presentation" })
            ) : option.icon,
            id: valueToId(id, option),
            isActive: isOpen && activeOption?.value === option.value,
            isSelected,
            onClick: () => {
              handleSelectOption(option), multiSelect || handleClose();
            },
            onFocus: () => setActiveOption(externalOption),
            shouldLookDisabled: isReset && selectedOptions.length === 0 && multiSelect,
            onKeyDown: (e) => {
              e.key === "Enter" || e.key === " " ? (e.preventDefault(), handleSelectOption(option), multiSelect || handleClose()) : e.key === "Tab" && (multiSelect || handleSelectOption(option), handleClose());
            }
          },
          option.children
        );
      })
    )));
  }
);
Select2.displayName = "Select";

// src/components/components/Popover/PopoverProvider.tsx
import React38, { useCallback as useCallback9, useState as useState12 } from "react";

// ../node_modules/@react-aria/collections/dist/BaseCollection.mjs
var $23b9f4fcf0fe224b$export$d68d59712b04d9d1 = class {
  get childNodes() {
    throw new Error("childNodes is not supported");
  }
  clone() {
    let node = new this.constructor(this.key);
    return node.value = this.value, node.level = this.level, node.hasChildNodes = this.hasChildNodes, node.rendered = this.rendered, node.textValue = this.textValue, node["aria-label"] = this["aria-label"], node.index = this.index, node.parentKey = this.parentKey, node.prevKey = this.prevKey, node.nextKey = this.nextKey, node.firstChildKey = this.firstChildKey, node.lastChildKey = this.lastChildKey, node.props = this.props, node.render = this.render, node.colSpan = this.colSpan, node.colIndex = this.colIndex, node;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  filter(collection, newCollection, filterFn) {
    let clone = this.clone();
    return newCollection.addDescendants(clone, collection), clone;
  }
  constructor(key) {
    this.value = null, this.level = 0, this.hasChildNodes = !1, this.rendered = null, this.textValue = "", this["aria-label"] = void 0, this.index = 0, this.parentKey = null, this.prevKey = null, this.nextKey = null, this.firstChildKey = null, this.lastChildKey = null, this.props = {}, this.colSpan = null, this.colIndex = null, this.type = this.constructor.type, this.key = key;
  }
}, $23b9f4fcf0fe224b$export$b1918e978f1ee46f = class extends $23b9f4fcf0fe224b$export$d68d59712b04d9d1 {
  filter(collection, newCollection, filterFn) {
    let [firstKey, lastKey] = $23b9f4fcf0fe224b$var$filterChildren(collection, newCollection, this.firstChildKey, filterFn), newNode = this.clone();
    return newNode.firstChildKey = firstKey, newNode.lastChildKey = lastKey, newNode;
  }
}, $23b9f4fcf0fe224b$export$5ae2504e948afce5 = class extends $23b9f4fcf0fe224b$export$d68d59712b04d9d1 {
};
$23b9f4fcf0fe224b$export$5ae2504e948afce5.type = "header";
var $23b9f4fcf0fe224b$export$8258a0665a675899 = class extends $23b9f4fcf0fe224b$export$d68d59712b04d9d1 {
};
$23b9f4fcf0fe224b$export$8258a0665a675899.type = "loader";
var $23b9f4fcf0fe224b$export$fd11f34e1d07f134 = class extends $23b9f4fcf0fe224b$export$b1918e978f1ee46f {
  filter(collection, newCollection, filterFn) {
    if (filterFn(this.textValue, this)) {
      let clone = this.clone();
      return newCollection.addDescendants(clone, collection), clone;
    }
    return null;
  }
};
$23b9f4fcf0fe224b$export$fd11f34e1d07f134.type = "item";
var $23b9f4fcf0fe224b$export$437f11dc9b403b78 = class extends $23b9f4fcf0fe224b$export$b1918e978f1ee46f {
  filter(collection, newCollection, filterFn) {
    let filteredSection = super.filter(collection, newCollection, filterFn);
    if (filteredSection && filteredSection.lastChildKey !== null) {
      let lastChild = collection.getItem(filteredSection.lastChildKey);
      if (lastChild && lastChild.type !== "header") return filteredSection;
    }
    return null;
  }
};
$23b9f4fcf0fe224b$export$437f11dc9b403b78.type = "section";
var $23b9f4fcf0fe224b$export$408d25a4e12db025 = class {
  get size() {
    return this.itemCount;
  }
  getKeys() {
    return this.keyMap.keys();
  }
  *[Symbol.iterator]() {
    let node = this.firstKey != null ? this.keyMap.get(this.firstKey) : void 0;
    for (; node; )
      yield node, node = node.nextKey != null ? this.keyMap.get(node.nextKey) : void 0;
  }
  getChildren(key) {
    let keyMap = this.keyMap;
    return {
      *[Symbol.iterator]() {
        let parent = keyMap.get(key), node = parent?.firstChildKey != null ? keyMap.get(parent.firstChildKey) : null;
        for (; node; )
          yield node, node = node.nextKey != null ? keyMap.get(node.nextKey) : void 0;
      }
    };
  }
  getKeyBefore(key) {
    let node = this.keyMap.get(key);
    if (!node) return null;
    if (node.prevKey != null) {
      for (node = this.keyMap.get(node.prevKey); node && node.type !== "item" && node.lastChildKey != null; ) node = this.keyMap.get(node.lastChildKey);
      var _node_key;
      return (_node_key = node?.key) !== null && _node_key !== void 0 ? _node_key : null;
    }
    return node.parentKey;
  }
  getKeyAfter(key) {
    let node = this.keyMap.get(key);
    if (!node) return null;
    if (node.type !== "item" && node.firstChildKey != null) return node.firstChildKey;
    for (; node; ) {
      if (node.nextKey != null) return node.nextKey;
      if (node.parentKey != null) node = this.keyMap.get(node.parentKey);
      else return null;
    }
    return null;
  }
  getFirstKey() {
    return this.firstKey;
  }
  getLastKey() {
    let node = this.lastKey != null ? this.keyMap.get(this.lastKey) : null;
    for (; node?.lastChildKey != null; ) node = this.keyMap.get(node.lastChildKey);
    var _node_key;
    return (_node_key = node?.key) !== null && _node_key !== void 0 ? _node_key : null;
  }
  getItem(key) {
    var _this_keyMap_get;
    return (_this_keyMap_get = this.keyMap.get(key)) !== null && _this_keyMap_get !== void 0 ? _this_keyMap_get : null;
  }
  at() {
    throw new Error("Not implemented");
  }
  clone() {
    let Constructor = this.constructor, collection = new Constructor();
    return collection.keyMap = new Map(this.keyMap), collection.firstKey = this.firstKey, collection.lastKey = this.lastKey, collection.itemCount = this.itemCount, collection;
  }
  addNode(node) {
    if (this.frozen) throw new Error("Cannot add a node to a frozen collection");
    node.type === "item" && this.keyMap.get(node.key) == null && this.itemCount++, this.keyMap.set(node.key, node);
  }
  // Deeply add a node and its children to the collection from another collection, primarily used when filtering a collection
  addDescendants(node, oldCollection) {
    this.addNode(node);
    let children = oldCollection.getChildren(node.key);
    for (let child of children) this.addDescendants(child, oldCollection);
  }
  removeNode(key) {
    if (this.frozen) throw new Error("Cannot remove a node to a frozen collection");
    let node = this.keyMap.get(key);
    node != null && node.type === "item" && this.itemCount--, this.keyMap.delete(key);
  }
  commit(firstKey, lastKey, isSSR = !1) {
    if (this.frozen) throw new Error("Cannot commit a frozen collection");
    this.firstKey = firstKey, this.lastKey = lastKey, this.frozen = !isSSR;
  }
  filter(filterFn) {
    let newCollection = new this.constructor(), [firstKey, lastKey] = $23b9f4fcf0fe224b$var$filterChildren(this, newCollection, this.firstKey, filterFn);
    return newCollection?.commit(firstKey, lastKey), newCollection;
  }
  constructor() {
    this.keyMap = /* @__PURE__ */ new Map(), this.firstKey = null, this.lastKey = null, this.frozen = !1, this.itemCount = 0;
  }
};
function $23b9f4fcf0fe224b$var$filterChildren(collection, newCollection, firstChildKey, filterFn) {
  if (firstChildKey == null) return [
    null,
    null
  ];
  let firstNode = null, lastNode = null, currentNode = collection.getItem(firstChildKey);
  for (; currentNode != null; ) {
    let newNode = currentNode.filter(collection, newCollection, filterFn);
    newNode != null && (newNode.nextKey = null, lastNode && (newNode.prevKey = lastNode.key, lastNode.nextKey = newNode.key), firstNode == null && (firstNode = newNode), newCollection.addNode(newNode), lastNode = newNode), currentNode = currentNode.nextKey ? collection.getItem(currentNode.nextKey) : null;
  }
  if (lastNode && lastNode.type === "separator") {
    let prevKey = lastNode.prevKey;
    newCollection.removeNode(lastNode.key), prevKey ? (lastNode = newCollection.getItem(prevKey), lastNode.nextKey = null) : lastNode = null;
  }
  var _firstNode_key, _lastNode_key;
  return [
    (_firstNode_key = firstNode?.key) !== null && _firstNode_key !== void 0 ? _firstNode_key : null,
    (_lastNode_key = lastNode?.key) !== null && _lastNode_key !== void 0 ? _lastNode_key : null
  ];
}

// ../node_modules/@react-aria/collections/dist/Document.mjs
var $681cc3c98f569e39$export$410b0c854570d131 = class {
  *[Symbol.iterator]() {
    let node = this.firstChild;
    for (; node; )
      yield node, node = node.nextSibling;
  }
  get firstChild() {
    return this._firstChild;
  }
  set firstChild(firstChild) {
    this._firstChild = firstChild, this.ownerDocument.markDirty(this);
  }
  get lastChild() {
    return this._lastChild;
  }
  set lastChild(lastChild) {
    this._lastChild = lastChild, this.ownerDocument.markDirty(this);
  }
  get previousSibling() {
    return this._previousSibling;
  }
  set previousSibling(previousSibling) {
    this._previousSibling = previousSibling, this.ownerDocument.markDirty(this);
  }
  get nextSibling() {
    return this._nextSibling;
  }
  set nextSibling(nextSibling) {
    this._nextSibling = nextSibling, this.ownerDocument.markDirty(this);
  }
  get parentNode() {
    return this._parentNode;
  }
  set parentNode(parentNode) {
    this._parentNode = parentNode, this.ownerDocument.markDirty(this);
  }
  get isConnected() {
    var _this_parentNode;
    return ((_this_parentNode = this.parentNode) === null || _this_parentNode === void 0 ? void 0 : _this_parentNode.isConnected) || !1;
  }
  invalidateChildIndices(child) {
    (this._minInvalidChildIndex == null || !this._minInvalidChildIndex.isConnected || child.index < this._minInvalidChildIndex.index) && (this._minInvalidChildIndex = child, this.ownerDocument.markDirty(this));
  }
  updateChildIndices() {
    let node = this._minInvalidChildIndex;
    for (; node; )
      node.index = node.previousSibling ? node.previousSibling.index + 1 : 0, node = node.nextSibling;
    this._minInvalidChildIndex = null;
  }
  appendChild(child) {
    child.parentNode && child.parentNode.removeChild(child), this.firstChild == null && (this.firstChild = child), this.lastChild ? (this.lastChild.nextSibling = child, child.index = this.lastChild.index + 1, child.previousSibling = this.lastChild) : (child.previousSibling = null, child.index = 0), child.parentNode = this, child.nextSibling = null, this.lastChild = child, this.ownerDocument.markDirty(this), this.isConnected && this.ownerDocument.queueUpdate();
  }
  insertBefore(newNode, referenceNode) {
    if (referenceNode == null) return this.appendChild(newNode);
    newNode.parentNode && newNode.parentNode.removeChild(newNode), newNode.nextSibling = referenceNode, newNode.previousSibling = referenceNode.previousSibling, newNode.index = referenceNode.index - 1, this.firstChild === referenceNode ? this.firstChild = newNode : referenceNode.previousSibling && (referenceNode.previousSibling.nextSibling = newNode), referenceNode.previousSibling = newNode, newNode.parentNode = referenceNode.parentNode, this.invalidateChildIndices(newNode), this.isConnected && this.ownerDocument.queueUpdate();
  }
  removeChild(child) {
    child.parentNode !== this || !this.ownerDocument.isMounted || (this._minInvalidChildIndex === child && (this._minInvalidChildIndex = null), child.nextSibling && (this.invalidateChildIndices(child.nextSibling), child.nextSibling.previousSibling = child.previousSibling), child.previousSibling && (child.previousSibling.nextSibling = child.nextSibling), this.firstChild === child && (this.firstChild = child.nextSibling), this.lastChild === child && (this.lastChild = child.previousSibling), child.parentNode = null, child.nextSibling = null, child.previousSibling = null, child.index = 0, this.ownerDocument.markDirty(child), this.isConnected && this.ownerDocument.queueUpdate());
  }
  addEventListener() {
  }
  removeEventListener() {
  }
  get previousVisibleSibling() {
    let node = this.previousSibling;
    for (; node && node.isHidden; ) node = node.previousSibling;
    return node;
  }
  get nextVisibleSibling() {
    let node = this.nextSibling;
    for (; node && node.isHidden; ) node = node.nextSibling;
    return node;
  }
  get firstVisibleChild() {
    let node = this.firstChild;
    for (; node && node.isHidden; ) node = node.nextSibling;
    return node;
  }
  get lastVisibleChild() {
    let node = this.lastChild;
    for (; node && node.isHidden; ) node = node.previousSibling;
    return node;
  }
  constructor(ownerDocument) {
    this._firstChild = null, this._lastChild = null, this._previousSibling = null, this._nextSibling = null, this._parentNode = null, this._minInvalidChildIndex = null, this.ownerDocument = ownerDocument;
  }
}, $681cc3c98f569e39$export$dc064fe9e59310fd = class _$681cc3c98f569e39$export$dc064fe9e59310fd extends $681cc3c98f569e39$export$410b0c854570d131 {
  get index() {
    return this._index;
  }
  set index(index3) {
    this._index = index3, this.ownerDocument.markDirty(this);
  }
  get level() {
    var _this_node;
    return this.parentNode instanceof _$681cc3c98f569e39$export$dc064fe9e59310fd ? this.parentNode.level + (((_this_node = this.node) === null || _this_node === void 0 ? void 0 : _this_node.type) === "item" ? 1 : 0) : 0;
  }
  /**
  * Lazily gets a mutable instance of a Node. If the node has already
  * been cloned during this update cycle, it just returns the existing one.
  */
  getMutableNode() {
    return this.node == null ? null : (this.isMutated || (this.node = this.node.clone(), this.isMutated = !0), this.ownerDocument.markDirty(this), this.node);
  }
  updateNode() {
    var _this_parentNode_node, _this_previousVisibleSibling_node, _this_previousVisibleSibling, _nextSibling_node, _this_firstVisibleChild_node, _this_firstVisibleChild, _this_lastVisibleChild_node, _this_lastVisibleChild;
    let nextSibling = this.nextVisibleSibling, node = this.getMutableNode();
    if (node != null) {
      node.index = this.index, node.level = this.level;
      var _this_parentNode_node_key;
      node.parentKey = this.parentNode instanceof _$681cc3c98f569e39$export$dc064fe9e59310fd && (_this_parentNode_node_key = (_this_parentNode_node = this.parentNode.node) === null || _this_parentNode_node === void 0 ? void 0 : _this_parentNode_node.key) !== null && _this_parentNode_node_key !== void 0 ? _this_parentNode_node_key : null;
      var _this_previousVisibleSibling_node_key;
      node.prevKey = (_this_previousVisibleSibling_node_key = (_this_previousVisibleSibling = this.previousVisibleSibling) === null || _this_previousVisibleSibling === void 0 || (_this_previousVisibleSibling_node = _this_previousVisibleSibling.node) === null || _this_previousVisibleSibling_node === void 0 ? void 0 : _this_previousVisibleSibling_node.key) !== null && _this_previousVisibleSibling_node_key !== void 0 ? _this_previousVisibleSibling_node_key : null;
      var _nextSibling_node_key;
      node.nextKey = (_nextSibling_node_key = nextSibling == null || (_nextSibling_node = nextSibling.node) === null || _nextSibling_node === void 0 ? void 0 : _nextSibling_node.key) !== null && _nextSibling_node_key !== void 0 ? _nextSibling_node_key : null, node.hasChildNodes = !!this.firstChild;
      var _this_firstVisibleChild_node_key;
      node.firstChildKey = (_this_firstVisibleChild_node_key = (_this_firstVisibleChild = this.firstVisibleChild) === null || _this_firstVisibleChild === void 0 || (_this_firstVisibleChild_node = _this_firstVisibleChild.node) === null || _this_firstVisibleChild_node === void 0 ? void 0 : _this_firstVisibleChild_node.key) !== null && _this_firstVisibleChild_node_key !== void 0 ? _this_firstVisibleChild_node_key : null;
      var _this_lastVisibleChild_node_key;
      if (node.lastChildKey = (_this_lastVisibleChild_node_key = (_this_lastVisibleChild = this.lastVisibleChild) === null || _this_lastVisibleChild === void 0 || (_this_lastVisibleChild_node = _this_lastVisibleChild.node) === null || _this_lastVisibleChild_node === void 0 ? void 0 : _this_lastVisibleChild_node.key) !== null && _this_lastVisibleChild_node_key !== void 0 ? _this_lastVisibleChild_node_key : null, (node.colSpan != null || node.colIndex != null) && nextSibling) {
        var _node_colIndex, _node_colSpan;
        let nextColIndex = ((_node_colIndex = node.colIndex) !== null && _node_colIndex !== void 0 ? _node_colIndex : node.index) + ((_node_colSpan = node.colSpan) !== null && _node_colSpan !== void 0 ? _node_colSpan : 1);
        if (nextSibling.node != null && nextColIndex !== nextSibling.node.colIndex) {
          let siblingNode = nextSibling.getMutableNode();
          siblingNode.colIndex = nextColIndex;
        }
      }
    }
  }
  setProps(obj, ref, CollectionNodeClass, rendered, render) {
    let node, { value: value1, textValue, id, ...props } = obj;
    if (this.node == null ? (node = new CollectionNodeClass(id ?? `react-aria-${++this.ownerDocument.nodeId}`), this.node = node) : node = this.getMutableNode(), props.ref = ref, node.props = props, node.rendered = rendered, node.render = render, node.value = value1, node.textValue = textValue || (typeof props.children == "string" ? props.children : "") || obj["aria-label"] || "", id != null && id !== node.key) throw new Error("Cannot change the id of an item");
    props.colSpan != null && (node.colSpan = props.colSpan), this.isConnected && this.ownerDocument.queueUpdate();
  }
  get style() {
    let element = this;
    return {
      get display() {
        return element.isHidden ? "none" : "";
      },
      set display(value) {
        let isHidden = value === "none";
        if (element.isHidden !== isHidden) {
          var _element_parentNode, _element_parentNode1;
          (((_element_parentNode = element.parentNode) === null || _element_parentNode === void 0 ? void 0 : _element_parentNode.firstVisibleChild) === element || ((_element_parentNode1 = element.parentNode) === null || _element_parentNode1 === void 0 ? void 0 : _element_parentNode1.lastVisibleChild) === element) && element.ownerDocument.markDirty(element.parentNode);
          let prev = element.previousVisibleSibling, next = element.nextVisibleSibling;
          prev && element.ownerDocument.markDirty(prev), next && element.ownerDocument.markDirty(next), element.isHidden = isHidden, element.ownerDocument.markDirty(element);
        }
      }
    };
  }
  hasAttribute() {
  }
  setAttribute() {
  }
  setAttributeNS() {
  }
  removeAttribute() {
  }
  constructor(type, ownerDocument) {
    super(ownerDocument), this.nodeType = 8, this.isMutated = !0, this._index = 0, this.isHidden = !1, this.node = null;
  }
}, $681cc3c98f569e39$export$b34a105447964f9f = class extends $681cc3c98f569e39$export$410b0c854570d131 {
  get isConnected() {
    return this.isMounted;
  }
  createElement(type) {
    return new $681cc3c98f569e39$export$dc064fe9e59310fd(type, this);
  }
  getMutableCollection() {
    return this.nextCollection || (this.nextCollection = this.collection.clone()), this.nextCollection;
  }
  markDirty(node) {
    this.dirtyNodes.add(node);
  }
  addNode(element) {
    if (element.isHidden || element.node == null) return;
    let collection = this.getMutableCollection();
    if (!collection.getItem(element.node.key)) for (let child of element) this.addNode(child);
    collection.addNode(element.node);
  }
  removeNode(node) {
    if (node.node == null) return;
    for (let child of node) this.removeNode(child);
    this.getMutableCollection().removeNode(node.node.key);
  }
  /** Finalizes the collection update, updating all nodes and freezing the collection. */
  getCollection() {
    return this.inSubscription ? this.collection.clone() : (this.queuedRender = !1, this.updateCollection(), this.collection);
  }
  updateCollection() {
    for (let element of this.dirtyNodes) element instanceof $681cc3c98f569e39$export$dc064fe9e59310fd && (!element.isConnected || element.isHidden) ? this.removeNode(element) : element.updateChildIndices();
    for (let element of this.dirtyNodes) element instanceof $681cc3c98f569e39$export$dc064fe9e59310fd && (element.isConnected && !element.isHidden && (element.updateNode(), this.addNode(element)), element.isMutated = !1);
    if (this.dirtyNodes.clear(), this.nextCollection) {
      var _this_firstVisibleChild_node, _this_firstVisibleChild, _this_lastVisibleChild_node, _this_lastVisibleChild, _this_firstVisibleChild_node_key, _this_lastVisibleChild_node_key;
      this.nextCollection.commit((_this_firstVisibleChild_node_key = (_this_firstVisibleChild = this.firstVisibleChild) === null || _this_firstVisibleChild === void 0 || (_this_firstVisibleChild_node = _this_firstVisibleChild.node) === null || _this_firstVisibleChild_node === void 0 ? void 0 : _this_firstVisibleChild_node.key) !== null && _this_firstVisibleChild_node_key !== void 0 ? _this_firstVisibleChild_node_key : null, (_this_lastVisibleChild_node_key = (_this_lastVisibleChild = this.lastVisibleChild) === null || _this_lastVisibleChild === void 0 || (_this_lastVisibleChild_node = _this_lastVisibleChild.node) === null || _this_lastVisibleChild_node === void 0 ? void 0 : _this_lastVisibleChild_node.key) !== null && _this_lastVisibleChild_node_key !== void 0 ? _this_lastVisibleChild_node_key : null, this.isSSR), this.isSSR || (this.collection = this.nextCollection, this.nextCollection = null);
    }
  }
  queueUpdate() {
    if (!(this.dirtyNodes.size === 0 || this.queuedRender)) {
      this.queuedRender = !0, this.inSubscription = !0;
      for (let fn of this.subscriptions) fn();
      this.inSubscription = !1;
    }
  }
  subscribe(fn) {
    return this.subscriptions.add(fn), () => this.subscriptions.delete(fn);
  }
  resetAfterSSR() {
    this.isSSR && (this.isSSR = !1, this.firstChild = null, this.lastChild = null, this.nodeId = 0);
  }
  constructor(collection) {
    super(null), this.nodeType = 11, this.ownerDocument = this, this.dirtyNodes = /* @__PURE__ */ new Set(), this.isSSR = !1, this.nodeId = 0, this.nodesByProps = /* @__PURE__ */ new WeakMap(), this.isMounted = !0, this.nextCollection = null, this.subscriptions = /* @__PURE__ */ new Set(), this.queuedRender = !1, this.inSubscription = !1, this.collection = collection, this.nextCollection = collection;
  }
};

// ../node_modules/@react-aria/collections/dist/useCachedChildren.mjs
import { useMemo as $luMFQ$useMemo, cloneElement as $luMFQ$cloneElement } from "react";
function $e948873055cbafe4$export$727c8fc270210f13(props) {
  let { children, items, idScope, addIdAndValue, dependencies = [] } = props, cache = $luMFQ$useMemo(() => /* @__PURE__ */ new WeakMap(), dependencies);
  return $luMFQ$useMemo(() => {
    if (items && typeof children == "function") {
      let res = [];
      for (let item of items) {
        let rendered = cache.get(item);
        if (!rendered) {
          rendered = children(item);
          var _rendered_props_id, _ref;
          let key = (_ref = (_rendered_props_id = rendered.props.id) !== null && _rendered_props_id !== void 0 ? _rendered_props_id : item.key) !== null && _ref !== void 0 ? _ref : item.id;
          if (key == null) throw new Error("Could not determine key for item");
          idScope && (key = idScope + ":" + key), rendered = $luMFQ$cloneElement(rendered, addIdAndValue ? {
            key,
            id: key,
            value: item
          } : {
            key
          }), cache.set(item, rendered);
        }
        res.push(rendered);
      }
      return res;
    } else if (typeof children != "function") return children;
  }, [
    children,
    items,
    cache,
    idScope,
    addIdAndValue
  ]);
}

// ../node_modules/@react-aria/collections/dist/Hidden.mjs
import $8SdCi$react, { createContext as $8SdCi$createContext, useContext as $8SdCi$useContext, forwardRef as $8SdCi$forwardRef } from "react";
if (typeof HTMLTemplateElement < "u") {
  let getFirstChild = Object.getOwnPropertyDescriptor(Node.prototype, "firstChild").get;
  Object.defineProperty(HTMLTemplateElement.prototype, "firstChild", {
    configurable: !0,
    enumerable: !0,
    get: function() {
      return this.dataset.reactAriaHidden ? this.content.firstChild : getFirstChild.call(this);
    }
  });
}
var $f39a9eba43920ace$export$94b6d0abf7d33e8c = $8SdCi$createContext(!1);
function $f39a9eba43920ace$export$8dc98ba7eadeaa56(props) {
  if ($8SdCi$useContext($f39a9eba43920ace$export$94b6d0abf7d33e8c))
    return $8SdCi$react.createElement($8SdCi$react.Fragment, null, props.children);
  let children = $8SdCi$react.createElement($f39a9eba43920ace$export$94b6d0abf7d33e8c.Provider, {
    value: !0
  }, props.children);
  return $8SdCi$react.createElement("template", {
    "data-react-aria-hidden": !0
  }, children);
}
function $f39a9eba43920ace$export$86427a43e3e48ebb(fn) {
  let Wrapper6 = (props, ref) => $8SdCi$useContext($f39a9eba43920ace$export$94b6d0abf7d33e8c) ? null : fn(props, ref);
  return Wrapper6.displayName = fn.displayName || fn.name, $8SdCi$forwardRef(Wrapper6);
}
function $f39a9eba43920ace$export$b5d7cc18bb8d2b59() {
  return $8SdCi$useContext($f39a9eba43920ace$export$94b6d0abf7d33e8c);
}

// ../node_modules/@react-aria/collections/dist/CollectionBuilder.mjs
import { createPortal as $95feo$createPortal } from "react-dom";
import $95feo$react, { createContext as $95feo$createContext, useContext as $95feo$useContext, useRef as $95feo$useRef, useCallback as $95feo$useCallback, useState as $95feo$useState, forwardRef as $95feo$forwardRef, useMemo as $95feo$useMemo } from "react";
import { useSyncExternalStore as $95feo$useSyncExternalStore } from "use-sync-external-store/shim/index.js";
var $e1995378a142960e$var$ShallowRenderContext = $95feo$createContext(!1), $e1995378a142960e$var$CollectionDocumentContext = $95feo$createContext(null);
function $e1995378a142960e$export$bf788dd355e3a401(props) {
  if ($95feo$useContext($e1995378a142960e$var$CollectionDocumentContext))
    return props.content;
  let { collection, document: document3 } = $e1995378a142960e$var$useCollectionDocument(props.createCollection);
  return $95feo$react.createElement($95feo$react.Fragment, null, $95feo$react.createElement($f39a9eba43920ace$export$8dc98ba7eadeaa56, null, $95feo$react.createElement($e1995378a142960e$var$CollectionDocumentContext.Provider, {
    value: document3
  }, props.content)), $95feo$react.createElement($e1995378a142960e$var$CollectionInner, {
    render: props.children,
    collection
  }));
}
function $e1995378a142960e$var$CollectionInner({ collection, render }) {
  return render(collection);
}
function $e1995378a142960e$var$useSyncExternalStoreFallback(subscribe, getSnapshot, getServerSnapshot) {
  let isSSR = $b5e257d569688ac6$export$535bd6ca7f90a273(), isSSRRef = $95feo$useRef(isSSR);
  isSSRRef.current = isSSR;
  let getSnapshotWrapper = $95feo$useCallback(() => isSSRRef.current ? getServerSnapshot() : getSnapshot(), [
    getSnapshot,
    getServerSnapshot
  ]);
  return $95feo$useSyncExternalStore(subscribe, getSnapshotWrapper);
}
var $e1995378a142960e$var$useSyncExternalStore = typeof $95feo$react.useSyncExternalStore == "function" ? $95feo$react.useSyncExternalStore : $e1995378a142960e$var$useSyncExternalStoreFallback;
function $e1995378a142960e$var$useCollectionDocument(createCollection) {
  let [document3] = $95feo$useState(() => new $681cc3c98f569e39$export$b34a105447964f9f(createCollection?.() || new $23b9f4fcf0fe224b$export$408d25a4e12db025())), subscribe = $95feo$useCallback((fn) => document3.subscribe(fn), [
    document3
  ]), getSnapshot = $95feo$useCallback(() => {
    let collection2 = document3.getCollection();
    return document3.isSSR && document3.resetAfterSSR(), collection2;
  }, [
    document3
  ]), getServerSnapshot = $95feo$useCallback(() => (document3.isSSR = !0, document3.getCollection()), [
    document3
  ]), collection = $e1995378a142960e$var$useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => (document3.isMounted = !0, () => {
    document3.isMounted = !1;
  }), [
    document3
  ]), {
    collection,
    document: document3
  };
}
var $e1995378a142960e$var$SSRContext = $95feo$createContext(null);
function $e1995378a142960e$var$createCollectionNodeClass(type) {
  var _class;
  return _class = class extends $23b9f4fcf0fe224b$export$d68d59712b04d9d1 {
  }, _class.type = type, _class;
}
function $e1995378a142960e$var$useSSRCollectionNode(CollectionNodeClass, props, ref, rendered, children, render) {
  typeof CollectionNodeClass == "string" && (CollectionNodeClass = $e1995378a142960e$var$createCollectionNodeClass(CollectionNodeClass));
  let itemRef = $95feo$useCallback((element) => {
    element?.setProps(props, ref, CollectionNodeClass, rendered, render);
  }, [
    props,
    ref,
    rendered,
    render,
    CollectionNodeClass
  ]), parentNode = $95feo$useContext($e1995378a142960e$var$SSRContext);
  if (parentNode) {
    let element = parentNode.ownerDocument.nodesByProps.get(props);
    return element || (element = parentNode.ownerDocument.createElement(CollectionNodeClass.type), element.setProps(props, ref, CollectionNodeClass, rendered, render), parentNode.appendChild(element), parentNode.ownerDocument.updateCollection(), parentNode.ownerDocument.nodesByProps.set(props, element)), children ? $95feo$react.createElement($e1995378a142960e$var$SSRContext.Provider, {
      value: element
    }, children) : null;
  }
  return $95feo$react.createElement(CollectionNodeClass.type, {
    ref: itemRef
  }, children);
}
function $e1995378a142960e$export$18af5c7a9e9b3664(CollectionNodeClass, render) {
  let Component3 = ({ node }) => render(node.props, node.props.ref, node), Result = $95feo$forwardRef((props, ref) => {
    let focusableProps = $95feo$useContext($f645667febf57a63$export$f9762fab77588ecb);
    if (!$95feo$useContext($e1995378a142960e$var$ShallowRenderContext)) {
      if (render.length >= 3) throw new Error(render.name + " cannot be rendered outside a collection.");
      return render(props, ref);
    }
    return $e1995378a142960e$var$useSSRCollectionNode(CollectionNodeClass, props, ref, "children" in props ? props.children : null, null, (node) => (
      // Forward FocusableContext to real DOM tree so tooltips work.
      $95feo$react.createElement($f645667febf57a63$export$f9762fab77588ecb.Provider, {
        value: focusableProps
      }, $95feo$react.createElement(Component3, {
        node
      }))
    ));
  });
  return Result.displayName = render.name, Result;
}
function $e1995378a142960e$export$e953bb1cd0f19726(CollectionNodeClass, render, useChildren = $e1995378a142960e$var$useCollectionChildren) {
  let Component3 = ({ node }) => render(node.props, node.props.ref, node), Result = $95feo$forwardRef((props, ref) => {
    let children = useChildren(props);
    var _useSSRCollectionNode;
    return (_useSSRCollectionNode = $e1995378a142960e$var$useSSRCollectionNode(CollectionNodeClass, props, ref, null, children, (node) => $95feo$react.createElement(Component3, {
      node
    }))) !== null && _useSSRCollectionNode !== void 0 ? _useSSRCollectionNode : $95feo$react.createElement($95feo$react.Fragment, null);
  });
  return Result.displayName = render.name, Result;
}
function $e1995378a142960e$var$useCollectionChildren(options) {
  return $e948873055cbafe4$export$727c8fc270210f13({
    ...options,
    addIdAndValue: !0
  });
}
var $e1995378a142960e$var$CollectionContext = $95feo$createContext(null);
function $e1995378a142960e$export$fb8073518f34e6ec(props) {
  let ctx = $95feo$useContext($e1995378a142960e$var$CollectionContext), dependencies = (ctx?.dependencies || []).concat(props.dependencies), idScope = props.idScope || ctx?.idScope, children = $e1995378a142960e$var$useCollectionChildren({
    ...props,
    idScope,
    dependencies
  });
  return $95feo$useContext($e1995378a142960e$var$CollectionDocumentContext) && (children = $95feo$react.createElement($e1995378a142960e$var$CollectionRoot, null, children)), ctx = $95feo$useMemo(() => ({
    dependencies,
    idScope
  }), [
    idScope,
    ...dependencies
  ]), $95feo$react.createElement($e1995378a142960e$var$CollectionContext.Provider, {
    value: ctx
  }, children);
}
function $e1995378a142960e$var$CollectionRoot({ children }) {
  let doc = $95feo$useContext($e1995378a142960e$var$CollectionDocumentContext), wrappedChildren = $95feo$useMemo(() => $95feo$react.createElement($e1995378a142960e$var$CollectionDocumentContext.Provider, {
    value: null
  }, $95feo$react.createElement($e1995378a142960e$var$ShallowRenderContext.Provider, {
    value: !0
  }, children)), [
    children
  ]);
  return $b5e257d569688ac6$export$535bd6ca7f90a273() ? $95feo$react.createElement($e1995378a142960e$var$SSRContext.Provider, {
    value: doc
  }, wrappedChildren) : $95feo$createPortal(wrappedChildren, doc);
}

// ../node_modules/react-aria-components/dist/Label.mjs
import $kc2Tc$react, { createContext as $kc2Tc$createContext } from "react";
var $01b77f81d0f07f68$export$75b6ee27786ba447 = $kc2Tc$createContext({}), $01b77f81d0f07f68$export$b04be29aa201d4f5 = $f39a9eba43920ace$export$86427a43e3e48ebb(function(props, ref) {
  [props, ref] = $64fa3d84918910a7$export$29f1550f4b0d4415(props, ref, $01b77f81d0f07f68$export$75b6ee27786ba447);
  let { elementType: ElementType = "label", ...labelProps } = props;
  return $kc2Tc$react.createElement(ElementType, {
    className: "react-aria-Label",
    ...labelProps,
    ref
  });
});

// ../node_modules/@react-aria/label/dist/useLabel.mjs
function $d191a55c9702f145$export$8467354a121f1b9f(props) {
  let { id, label, "aria-labelledby": ariaLabelledby, "aria-label": ariaLabel, labelElementType = "label" } = props;
  id = $bdb11010cef70236$export$f680877a34711e37(id);
  let labelId = $bdb11010cef70236$export$f680877a34711e37(), labelProps = {};
  label ? (ariaLabelledby = ariaLabelledby ? `${labelId} ${ariaLabelledby}` : labelId, labelProps = {
    id: labelId,
    htmlFor: labelElementType === "label" ? id : void 0
  }) : !ariaLabelledby && !ariaLabel && process.env.NODE_ENV !== "production" && console.warn("If you do not provide a visible label, you must specify an aria-label or aria-labelledby attribute for accessibility");
  let fieldProps = $313b98861ee5dd6c$export$d6875122194c7b44({
    id,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby
  });
  return {
    labelProps,
    fieldProps
  };
}

// ../node_modules/@react-aria/progress/dist/useProgressBar.mjs
function $204d9ebcedfb8806$export$ed5abd763a836edc(props) {
  let { value = 0, minValue = 0, maxValue = 100, valueLabel, isIndeterminate, formatOptions = {
    style: "percent"
  } } = props, domProps = $65484d02dcb7eb3e$export$457c3d6518dd4c6f(props, {
    labelable: !0
  }), { labelProps, fieldProps } = $d191a55c9702f145$export$8467354a121f1b9f({
    ...props,
    // Progress bar is not an HTML input element so it
    // shouldn't be labeled by a <label> element.
    labelElementType: "span"
  });
  value = $9446cca9a3875146$export$7d15b64cf5a3a4c4(value, minValue, maxValue);
  let percentage = (value - minValue) / (maxValue - minValue), formatter = $a916eb452884faea$export$b7a616150fdb9f44(formatOptions);
  if (!isIndeterminate && !valueLabel) {
    let valueToFormat = formatOptions.style === "percent" ? percentage : value;
    valueLabel = formatter.format(valueToFormat);
  }
  return {
    progressBarProps: $3ef42575df84b30b$export$9d1611c77c2fe928(domProps, {
      ...fieldProps,
      "aria-valuenow": isIndeterminate ? void 0 : value,
      "aria-valuemin": minValue,
      "aria-valuemax": maxValue,
      "aria-valuetext": isIndeterminate ? void 0 : valueLabel,
      role: "progressbar"
    }),
    labelProps
  };
}

// ../node_modules/react-aria-components/dist/ProgressBar.mjs
import $hU2kz$react, { createContext as $hU2kz$createContext, forwardRef as $hU2kz$forwardRef } from "react";
var $0393f8ab869a0f1a$export$e9f3bf65a26ce129 = $hU2kz$createContext(null), $0393f8ab869a0f1a$export$c17561cb55d4db30 = $hU2kz$forwardRef(function(props, ref) {
  [props, ref] = $64fa3d84918910a7$export$29f1550f4b0d4415(props, ref, $0393f8ab869a0f1a$export$e9f3bf65a26ce129);
  let { value = 0, minValue = 0, maxValue = 100, isIndeterminate = !1 } = props;
  value = $9446cca9a3875146$export$7d15b64cf5a3a4c4(value, minValue, maxValue);
  let [labelRef, label] = $64fa3d84918910a7$export$9d4c57ee4c6ffdd8(!props["aria-label"] && !props["aria-labelledby"]), { progressBarProps, labelProps } = $204d9ebcedfb8806$export$ed5abd763a836edc({
    ...props,
    label
  }), percentage = isIndeterminate ? void 0 : (value - minValue) / (maxValue - minValue) * 100, renderProps = $64fa3d84918910a7$export$4d86445c2cf5e3({
    ...props,
    defaultClassName: "react-aria-ProgressBar",
    values: {
      percentage,
      valueText: progressBarProps["aria-valuetext"],
      isIndeterminate
    }
  }), DOMProps = $65484d02dcb7eb3e$export$457c3d6518dd4c6f(props, {
    global: !0
  });
  return $hU2kz$react.createElement("div", {
    ...$3ef42575df84b30b$export$9d1611c77c2fe928(DOMProps, renderProps, progressBarProps),
    ref,
    slot: props.slot || void 0
  }, $hU2kz$react.createElement($01b77f81d0f07f68$export$75b6ee27786ba447.Provider, {
    value: {
      ...labelProps,
      ref: labelRef,
      elementType: "span"
    }
  }, renderProps.children));
});

// ../node_modules/@react-aria/live-announcer/dist/LiveAnnouncer.mjs
var $319e236875307eab$var$liveAnnouncer = null;
function $319e236875307eab$export$a9b970dcc4ae71a9(message, assertiveness = "assertive", timeout = 7e3) {
  $319e236875307eab$var$liveAnnouncer ? $319e236875307eab$var$liveAnnouncer.announce(message, assertiveness, timeout) : ($319e236875307eab$var$liveAnnouncer = new $319e236875307eab$var$LiveAnnouncer(), (typeof IS_REACT_ACT_ENVIRONMENT == "boolean" ? IS_REACT_ACT_ENVIRONMENT : typeof jest < "u") ? $319e236875307eab$var$liveAnnouncer.announce(message, assertiveness, timeout) : setTimeout(() => {
    $319e236875307eab$var$liveAnnouncer?.isAttached() && $319e236875307eab$var$liveAnnouncer?.announce(message, assertiveness, timeout);
  }, 100));
}
var $319e236875307eab$var$LiveAnnouncer = class {
  isAttached() {
    var _this_node;
    return (_this_node = this.node) === null || _this_node === void 0 ? void 0 : _this_node.isConnected;
  }
  createLog(ariaLive) {
    let node = document.createElement("div");
    return node.setAttribute("role", "log"), node.setAttribute("aria-live", ariaLive), node.setAttribute("aria-relevant", "additions"), node;
  }
  destroy() {
    this.node && (document.body.removeChild(this.node), this.node = null);
  }
  announce(message, assertiveness = "assertive", timeout = 7e3) {
    var _this_assertiveLog, _this_politeLog;
    if (!this.node) return;
    let node = document.createElement("div");
    typeof message == "object" ? (node.setAttribute("role", "img"), node.setAttribute("aria-labelledby", message["aria-labelledby"])) : node.textContent = message, assertiveness === "assertive" ? (_this_assertiveLog = this.assertiveLog) === null || _this_assertiveLog === void 0 || _this_assertiveLog.appendChild(node) : (_this_politeLog = this.politeLog) === null || _this_politeLog === void 0 || _this_politeLog.appendChild(node), message !== "" && setTimeout(() => {
      node.remove();
    }, timeout);
  }
  clear(assertiveness) {
    this.node && ((!assertiveness || assertiveness === "assertive") && this.assertiveLog && (this.assertiveLog.innerHTML = ""), (!assertiveness || assertiveness === "polite") && this.politeLog && (this.politeLog.innerHTML = ""));
  }
  constructor() {
    this.node = null, this.assertiveLog = null, this.politeLog = null, typeof document < "u" && (this.node = document.createElement("div"), this.node.dataset.liveAnnouncer = "true", Object.assign(this.node.style, {
      border: 0,
      clip: "rect(0 0 0 0)",
      clipPath: "inset(50%)",
      height: "1px",
      margin: "-1px",
      overflow: "hidden",
      padding: 0,
      position: "absolute",
      width: "1px",
      whiteSpace: "nowrap"
    }), this.assertiveLog = this.createLog("assertive"), this.node.appendChild(this.assertiveLog), this.politeLog = this.createLog("polite"), this.node.appendChild(this.politeLog), document.body.prepend(this.node));
  }
};

// ../node_modules/@react-aria/button/dist/useButton.mjs
function $701a24aa0da5b062$export$ea18c227d4417cc3(props, ref) {
  let { elementType = "button", isDisabled, onPress, onPressStart, onPressEnd, onPressUp, onPressChange, preventFocusOnPress, allowFocusWhenDisabled, onClick, href, target, rel, type = "button" } = props, additionalProps;
  elementType === "button" ? additionalProps = {
    type,
    disabled: isDisabled,
    form: props.form,
    formAction: props.formAction,
    formEncType: props.formEncType,
    formMethod: props.formMethod,
    formNoValidate: props.formNoValidate,
    formTarget: props.formTarget,
    name: props.name,
    value: props.value
  } : additionalProps = {
    role: "button",
    href: elementType === "a" && !isDisabled ? href : void 0,
    target: elementType === "a" ? target : void 0,
    type: elementType === "input" ? type : void 0,
    disabled: elementType === "input" ? isDisabled : void 0,
    "aria-disabled": !isDisabled || elementType === "input" ? void 0 : isDisabled,
    rel: elementType === "a" ? rel : void 0
  };
  let { pressProps, isPressed } = $f6c31cce2adf654f$export$45712eceda6fad21({
    onPressStart,
    onPressEnd,
    onPressChange,
    onPress,
    onPressUp,
    onClick,
    isDisabled,
    preventFocusOnPress,
    ref
  }), { focusableProps } = $f645667febf57a63$export$4c014de7c8940b4c(props, ref);
  allowFocusWhenDisabled && (focusableProps.tabIndex = isDisabled ? -1 : focusableProps.tabIndex);
  let buttonProps = $3ef42575df84b30b$export$9d1611c77c2fe928(focusableProps, pressProps, $65484d02dcb7eb3e$export$457c3d6518dd4c6f(props, {
    labelable: !0
  }));
  return {
    isPressed,
    buttonProps: $3ef42575df84b30b$export$9d1611c77c2fe928(additionalProps, buttonProps, {
      "aria-haspopup": props["aria-haspopup"],
      "aria-expanded": props["aria-expanded"],
      "aria-controls": props["aria-controls"],
      "aria-pressed": props["aria-pressed"],
      "aria-current": props["aria-current"],
      "aria-disabled": props["aria-disabled"]
    })
  };
}

// ../node_modules/@react-aria/button/node_modules/@react-aria/toolbar/dist/useToolbar.mjs
import { useState as $k3LOe$useState, useRef as $k3LOe$useRef } from "react";

// ../node_modules/react-aria-components/dist/Button.mjs
import $fM325$react, { createContext as $fM325$createContext, useRef as $fM325$useRef, useEffect as $fM325$useEffect } from "react";
var $d2b4bc8c273e7be6$export$24d547caef80ccd1 = $fM325$createContext({}), $d2b4bc8c273e7be6$export$353f5b6fc5456de1 = $f39a9eba43920ace$export$86427a43e3e48ebb(function(props, ref) {
  [props, ref] = $64fa3d84918910a7$export$29f1550f4b0d4415(props, ref, $d2b4bc8c273e7be6$export$24d547caef80ccd1), props = $d2b4bc8c273e7be6$var$disablePendingProps(props);
  let ctx = props, { isPending } = ctx, { buttonProps, isPressed } = $701a24aa0da5b062$export$ea18c227d4417cc3(props, ref), { focusProps, isFocused, isFocusVisible } = $f7dceffc5ad7768b$export$4e328f61c538687f(props), { hoverProps, isHovered } = $6179b936705e76d3$export$ae780daf29e6d456({
    ...props,
    isDisabled: props.isDisabled || isPending
  }), renderValues = {
    isHovered,
    isPressed: (ctx.isPressed || isPressed) && !isPending,
    isFocused,
    isFocusVisible,
    isDisabled: props.isDisabled || !1,
    isPending: isPending ?? !1
  }, renderProps = $64fa3d84918910a7$export$4d86445c2cf5e3({
    ...props,
    values: renderValues,
    defaultClassName: "react-aria-Button"
  }), buttonId = $bdb11010cef70236$export$f680877a34711e37(buttonProps.id), progressId = $bdb11010cef70236$export$f680877a34711e37(), ariaLabelledby = buttonProps["aria-labelledby"];
  isPending && (ariaLabelledby ? ariaLabelledby = `${ariaLabelledby} ${progressId}` : buttonProps["aria-label"] && (ariaLabelledby = `${buttonId} ${progressId}`));
  let wasPending = $fM325$useRef(isPending);
  $fM325$useEffect(() => {
    let message = {
      "aria-labelledby": ariaLabelledby || buttonId
    };
    !wasPending.current && isFocused && isPending ? $319e236875307eab$export$a9b970dcc4ae71a9(message, "assertive") : wasPending.current && isFocused && !isPending && $319e236875307eab$export$a9b970dcc4ae71a9(message, "assertive"), wasPending.current = isPending;
  }, [
    isPending,
    isFocused,
    ariaLabelledby,
    buttonId
  ]);
  let DOMProps = $65484d02dcb7eb3e$export$457c3d6518dd4c6f(props, {
    global: !0
  });
  return delete DOMProps.onClick, $fM325$react.createElement("button", {
    ...$3ef42575df84b30b$export$9d1611c77c2fe928(DOMProps, renderProps, buttonProps, focusProps, hoverProps),
    // When the button is in a pending state, we want to stop implicit form submission (ie. when the user presses enter on a text input).
    // We do this by changing the button's type to button.
    type: buttonProps.type === "submit" && isPending ? "button" : buttonProps.type,
    id: buttonId,
    ref,
    "aria-labelledby": ariaLabelledby,
    slot: props.slot || void 0,
    "aria-disabled": isPending ? "true" : buttonProps["aria-disabled"],
    "data-disabled": props.isDisabled || void 0,
    "data-pressed": renderValues.isPressed || void 0,
    "data-hovered": isHovered || void 0,
    "data-focused": isFocused || void 0,
    "data-pending": isPending || void 0,
    "data-focus-visible": isFocusVisible || void 0
  }, $fM325$react.createElement($0393f8ab869a0f1a$export$e9f3bf65a26ce129.Provider, {
    value: {
      id: progressId
    }
  }, renderProps.children));
});
function $d2b4bc8c273e7be6$var$disablePendingProps(props) {
  return props.isPending && (props.onPress = void 0, props.onPressStart = void 0, props.onPressEnd = void 0, props.onPressChange = void 0, props.onPressUp = void 0, props.onKeyDown = void 0, props.onKeyUp = void 0, props.onClick = void 0, props.href = void 0), props;
}

// ../node_modules/react-aria-components/dist/Popover.mjs
import $ehFet$react, { createContext as $ehFet$createContext, forwardRef as $ehFet$forwardRef, useContext as $ehFet$useContext, useRef as $ehFet$useRef, useState as $ehFet$useState, useEffect as $ehFet$useEffect, useMemo as $ehFet$useMemo } from "react";
var $07b14b47974efb58$export$9b9a0cd73afb7ca4 = $ehFet$createContext(null), $07b14b47974efb58$var$PopoverGroupContext = $ehFet$createContext(null), $07b14b47974efb58$export$5b6b19405a83ff9d = $ehFet$forwardRef(function(props, ref) {
  [props, ref] = $64fa3d84918910a7$export$29f1550f4b0d4415(props, ref, $07b14b47974efb58$export$9b9a0cd73afb7ca4);
  let contextState = $ehFet$useContext($de32f1b87079253c$export$d2f961adcb0afbe), localState = $fc909762b330b746$export$61c6a8c84e605fb6(props), state = props.isOpen != null || props.defaultOpen != null || !contextState ? localState : contextState, isExiting = $d3f049242431219c$export$45fda7c47f93fd48(ref, state.isOpen) || props.isExiting || !1, isHidden = $f39a9eba43920ace$export$b5d7cc18bb8d2b59(), { direction } = $18f2051aff69b9bf$export$43bb16f9c6d9e3f7();
  if (isHidden) {
    let children = props.children;
    return typeof children == "function" && (children = children({
      trigger: props.trigger || null,
      placement: "bottom",
      isEntering: !1,
      isExiting: !1,
      defaultChildren: null
    })), $ehFet$react.createElement($ehFet$react.Fragment, null, children);
  }
  return state && !state.isOpen && !isExiting ? null : $ehFet$react.createElement($07b14b47974efb58$var$PopoverInner, {
    ...props,
    triggerRef: props.triggerRef,
    state,
    popoverRef: ref,
    isExiting,
    dir: direction
  });
});
function $07b14b47974efb58$var$PopoverInner({ state, isExiting, UNSTABLE_portalContainer, clearContexts, ...props }) {
  let arrowRef = $ehFet$useRef(null), containerRef = $ehFet$useRef(null), groupCtx = $ehFet$useContext($07b14b47974efb58$var$PopoverGroupContext), isSubPopover = groupCtx && props.trigger === "SubmenuTrigger";
  var _props_offset;
  let { popoverProps, underlayProps, arrowProps, placement, triggerAnchorPoint } = $f2f8a6077418541e$export$542a6fd13ac93354({
    ...props,
    offset: (_props_offset = props.offset) !== null && _props_offset !== void 0 ? _props_offset : 8,
    arrowRef,
    // If this is a submenu/subdialog, use the root popover's container
    // to detect outside interaction and add aria-hidden.
    groupRef: isSubPopover ? groupCtx : containerRef
  }, state), ref = props.popoverRef, isEntering = $d3f049242431219c$export$6d3443f2c48bfc20(ref, !!placement) || props.isEntering || !1, renderProps = $64fa3d84918910a7$export$4d86445c2cf5e3({
    ...props,
    defaultClassName: "react-aria-Popover",
    values: {
      trigger: props.trigger || null,
      placement,
      isEntering,
      isExiting
    }
  }), shouldBeDialog = !props.isNonModal || props.trigger === "SubmenuTrigger", [isDialog, setDialog] = $ehFet$useState(!1);
  $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => {
    ref.current && setDialog(shouldBeDialog && !ref.current.querySelector("[role=dialog]"));
  }, [
    ref,
    shouldBeDialog
  ]), $ehFet$useEffect(() => {
    isDialog && props.trigger !== "SubmenuTrigger" && ref.current && !ref.current.contains(document.activeElement) && $3ad3f6e1647bc98d$export$80f3e147d781571c(ref.current);
  }, [
    isDialog,
    ref,
    props.trigger
  ]);
  let children = $ehFet$useMemo(() => {
    let children2 = renderProps.children;
    if (clearContexts) for (let Context of clearContexts) children2 = $ehFet$react.createElement(Context.Provider, {
      value: null
    }, children2);
    return children2;
  }, [
    renderProps.children,
    clearContexts
  ]), style = {
    ...popoverProps.style,
    "--trigger-anchor-point": triggerAnchorPoint ? `${triggerAnchorPoint.x}px ${triggerAnchorPoint.y}px` : void 0,
    ...renderProps.style
  }, overlay = $ehFet$react.createElement("div", {
    ...$3ef42575df84b30b$export$9d1611c77c2fe928($65484d02dcb7eb3e$export$457c3d6518dd4c6f(props, {
      global: !0
    }), popoverProps),
    ...renderProps,
    role: isDialog ? "dialog" : void 0,
    tabIndex: isDialog ? -1 : void 0,
    "aria-label": props["aria-label"],
    "aria-labelledby": props["aria-labelledby"],
    ref,
    slot: props.slot || void 0,
    style,
    dir: props.dir,
    "data-trigger": props.trigger,
    "data-placement": placement,
    "data-entering": isEntering || void 0,
    "data-exiting": isExiting || void 0
  }, !props.isNonModal && $ehFet$react.createElement($86ea4cb521eb2e37$export$2317d149ed6f78c4, {
    onDismiss: state.close
  }), $ehFet$react.createElement($44f671af83e7d9e0$export$2de4954e8ae13b9f.Provider, {
    value: {
      ...arrowProps,
      placement,
      ref: arrowRef
    }
  }, children), $ehFet$react.createElement($86ea4cb521eb2e37$export$2317d149ed6f78c4, {
    onDismiss: state.close
  }));
  if (!isSubPopover) return $ehFet$react.createElement($337b884510726a0d$export$c6fdb837b070b4ff, {
    ...props,
    shouldContainFocus: isDialog,
    isExiting,
    portalContainer: UNSTABLE_portalContainer
  }, !props.isNonModal && state.isOpen && $ehFet$react.createElement("div", {
    "data-testid": "underlay",
    ...underlayProps,
    style: {
      position: "fixed",
      inset: 0
    }
  }), $ehFet$react.createElement("div", {
    ref: containerRef,
    style: {
      display: "contents"
    }
  }, $ehFet$react.createElement($07b14b47974efb58$var$PopoverGroupContext.Provider, {
    value: containerRef
  }, overlay)));
  var _ref;
  return $ehFet$react.createElement($337b884510726a0d$export$c6fdb837b070b4ff, {
    ...props,
    shouldContainFocus: isDialog,
    isExiting,
    portalContainer: (_ref = UNSTABLE_portalContainer ?? groupCtx?.current) !== null && _ref !== void 0 ? _ref : void 0
  }, overlay);
}

// ../node_modules/react-aria-components/dist/Collection.mjs
import $18I52$react, { createContext as $18I52$createContext, useContext as $18I52$useContext, isValidElement as $18I52$isValidElement, cloneElement as $18I52$cloneElement, useMemo as $18I52$useMemo } from "react";
var $7135fc7d473fd974$export$d40e14dec8b060a8 = $18I52$createContext(null), $7135fc7d473fd974$export$6e2c8f0811a474ce = $e1995378a142960e$export$e953bb1cd0f19726("section", (props, ref, section) => {
  let { name, render } = $18I52$useContext($7135fc7d473fd974$export$d40e14dec8b060a8);
  return process.env.NODE_ENV !== "production" && console.warn(`<Section> is deprecated. Please use <${name}> instead.`), render(props, ref, section, "react-aria-Section");
}), $7135fc7d473fd974$export$a164736487e3f0ae = {
  CollectionRoot({ collection, renderDropIndicator }) {
    return $7135fc7d473fd974$var$useCollectionRender(collection, null, renderDropIndicator);
  },
  CollectionBranch({ collection, parent, renderDropIndicator }) {
    return $7135fc7d473fd974$var$useCollectionRender(collection, parent, renderDropIndicator);
  }
};
function $7135fc7d473fd974$var$useCollectionRender(collection, parent, renderDropIndicator) {
  return $e948873055cbafe4$export$727c8fc270210f13({
    items: parent ? collection.getChildren(parent.key) : collection,
    dependencies: [
      renderDropIndicator
    ],
    children(node) {
      let rendered = node.render(node);
      return !renderDropIndicator || node.type !== "item" ? rendered : $18I52$react.createElement($18I52$react.Fragment, null, renderDropIndicator({
        type: "item",
        key: node.key,
        dropPosition: "before"
      }), rendered, $7135fc7d473fd974$export$2dbbd341daed716d(collection, node, renderDropIndicator));
    }
  });
}
function $7135fc7d473fd974$export$2dbbd341daed716d(collection, node, renderDropIndicator) {
  let key = node.key, keyAfter = collection.getKeyAfter(key), nextItemInFlattenedCollection = keyAfter != null ? collection.getItem(keyAfter) : null;
  for (; nextItemInFlattenedCollection != null && nextItemInFlattenedCollection.type !== "item"; )
    keyAfter = collection.getKeyAfter(nextItemInFlattenedCollection.key), nextItemInFlattenedCollection = keyAfter != null ? collection.getItem(keyAfter) : null;
  let nextItemInSameLevel = node.nextKey != null ? collection.getItem(node.nextKey) : null;
  for (; nextItemInSameLevel != null && nextItemInSameLevel.type !== "item"; ) nextItemInSameLevel = nextItemInSameLevel.nextKey != null ? collection.getItem(nextItemInSameLevel.nextKey) : null;
  let afterIndicators = [];
  if (nextItemInSameLevel == null) {
    let current = node;
    for (; current && (!nextItemInFlattenedCollection || current.parentKey !== nextItemInFlattenedCollection.parentKey && nextItemInFlattenedCollection.level < current.level); ) {
      let indicator = renderDropIndicator({
        type: "item",
        key: current.key,
        dropPosition: "after"
      });
      $18I52$isValidElement(indicator) && afterIndicators.push($18I52$cloneElement(indicator, {
        key: `${current.key}-after`
      })), current = current.parentKey != null ? collection.getItem(current.parentKey) : null;
    }
  }
  return afterIndicators;
}
var $7135fc7d473fd974$export$4feb769f8ddf26c5 = $18I52$createContext($7135fc7d473fd974$export$a164736487e3f0ae);
function $7135fc7d473fd974$export$90e00781bc59d8f9(focusedKey) {
  return $18I52$useMemo(() => focusedKey != null ? /* @__PURE__ */ new Set([
    focusedKey
  ]) : null, [
    focusedKey
  ]);
}

// ../node_modules/react-aria-components/dist/context.mjs
import { createContext as $8m4bF$createContext } from "react";
var $8e6cc465cc68f603$export$b0d3ecf7112093a7 = $8m4bF$createContext(null), $8e6cc465cc68f603$export$698f465ec27e93df = $8m4bF$createContext(null);

// ../node_modules/react-aria-components/dist/Header.mjs
import $i47tY$react, { createContext as $i47tY$createContext } from "react";
var $72a5793c14baf454$export$e0e4026c12a8bdbb = $i47tY$createContext({}), $72a5793c14baf454$export$8b251419efc915eb = $e1995378a142960e$export$18af5c7a9e9b3664($23b9f4fcf0fe224b$export$5ae2504e948afce5, function(props, ref) {
  return [props, ref] = $64fa3d84918910a7$export$29f1550f4b0d4415(props, ref, $72a5793c14baf454$export$e0e4026c12a8bdbb), $i47tY$react.createElement("header", {
    className: "react-aria-Header",
    ...props,
    ref
  }, props.children);
});

// ../node_modules/react-aria-components/dist/Keyboard.mjs
import $3zqIJ$react, { createContext as $3zqIJ$createContext, forwardRef as $3zqIJ$forwardRef } from "react";
var $63df2425e2108aa8$export$744d98a3b8a94e1c = $3zqIJ$createContext({}), $63df2425e2108aa8$export$16e4d70cc375e707 = $3zqIJ$forwardRef(function(props, ref) {
  return [props, ref] = $64fa3d84918910a7$export$29f1550f4b0d4415(props, ref, $63df2425e2108aa8$export$744d98a3b8a94e1c), $3zqIJ$react.createElement("kbd", {
    dir: "ltr",
    ...props,
    ref
  });
});

// ../node_modules/@react-aria/separator/dist/useSeparator.mjs
function $f4b273590fab9f93$export$52210f68a14655d0(props) {
  let domProps = $65484d02dcb7eb3e$export$457c3d6518dd4c6f(props, {
    labelable: !0
  }), ariaOrientation;
  return props.orientation === "vertical" && (ariaOrientation = "vertical"), props.elementType !== "hr" ? {
    separatorProps: {
      ...domProps,
      role: "separator",
      "aria-orientation": ariaOrientation
    }
  } : {
    separatorProps: domProps
  };
}

// ../node_modules/react-aria-components/dist/Separator.mjs
import $i9JCE$react, { createContext as $i9JCE$createContext } from "react";
var $431f98aba6844401$export$6615d83f6de245ce = $i9JCE$createContext({}), $431f98aba6844401$export$7750289ca694c0b5 = class extends $23b9f4fcf0fe224b$export$d68d59712b04d9d1 {
  filter(collection, newCollection) {
    let prevItem = newCollection.getItem(this.prevKey);
    if (prevItem && prevItem.type !== "separator") {
      let clone = this.clone();
      return newCollection.addDescendants(clone, collection), clone;
    }
    return null;
  }
};
$431f98aba6844401$export$7750289ca694c0b5.type = "separator";
var $431f98aba6844401$export$1ff3c3f08ae963c0 = $e1995378a142960e$export$18af5c7a9e9b3664($431f98aba6844401$export$7750289ca694c0b5, function(props, ref) {
  [props, ref] = $64fa3d84918910a7$export$29f1550f4b0d4415(props, ref, $431f98aba6844401$export$6615d83f6de245ce);
  let { elementType, orientation, style, className, slot, ...otherProps } = props, Element2 = elementType || "hr";
  Element2 === "hr" && orientation === "vertical" && (Element2 = "div");
  let { separatorProps } = $f4b273590fab9f93$export$52210f68a14655d0({
    ...otherProps,
    elementType,
    orientation
  }), DOMProps = $65484d02dcb7eb3e$export$457c3d6518dd4c6f(props, {
    global: !0
  });
  return $i9JCE$react.createElement(Element2, {
    ...$3ef42575df84b30b$export$9d1611c77c2fe928(DOMProps, separatorProps),
    style,
    className: className ?? "react-aria-Separator",
    ref,
    slot: slot || void 0
  });
});

// ../node_modules/@react-aria/menu/dist/ar-AE.mjs
var $c0398ad35c3639b7$exports = {};
$c0398ad35c3639b7$exports = {
  longPressMessage: "\u0627\u0636\u063A\u0637 \u0645\u0637\u0648\u0644\u0627\u064B \u0623\u0648 \u0627\u0636\u063A\u0637 \u0639\u0644\u0649 Alt + \u0627\u0644\u0633\u0647\u0645 \u0644\u0623\u0633\u0641\u0644 \u0644\u0641\u062A\u062D \u0627\u0644\u0642\u0627\u0626\u0645\u0629"
};

// ../node_modules/@react-aria/menu/dist/bg-BG.mjs
var $7af657c4165927c3$exports = {};
$7af657c4165927c3$exports = {
  longPressMessage: "\u041D\u0430\u0442\u0438\u0441\u043D\u0435\u0442\u0435 \u043F\u0440\u043E\u0434\u044A\u043B\u0436\u0438\u0442\u0435\u043B\u043D\u043E \u0438\u043B\u0438 \u043D\u0430\u0442\u0438\u0441\u043D\u0435\u0442\u0435 Alt+ \u0441\u0442\u0440\u0435\u043B\u043A\u0430 \u043D\u0430\u0434\u043E\u043B\u0443, \u0437\u0430 \u0434\u0430 \u043E\u0442\u0432\u043E\u0440\u0438\u0442\u0435 \u043C\u0435\u043D\u044E\u0442\u043E"
};

// ../node_modules/@react-aria/menu/dist/cs-CZ.mjs
var $d95d4da6d531ab81$exports = {};
$d95d4da6d531ab81$exports = {
  longPressMessage: "Dlouh\xFDm stiskem nebo stisknut\xEDm kl\xE1ves Alt + \u0161ipka dol\u016F otev\u0159ete nab\xEDdku"
};

// ../node_modules/@react-aria/menu/dist/da-DK.mjs
var $24ebda9c775dca17$exports = {};
$24ebda9c775dca17$exports = {
  longPressMessage: "Langt tryk eller tryk p\xE5 Alt + pil ned for at \xE5bne menuen"
};

// ../node_modules/@react-aria/menu/dist/de-DE.mjs
var $743e0dfca6cab1e9$exports = {};
$743e0dfca6cab1e9$exports = {
  longPressMessage: "Dr\xFCcken Sie lange oder dr\xFCcken Sie Alt + Nach-unten, um das Men\xFC zu \xF6ffnen"
};

// ../node_modules/@react-aria/menu/dist/el-GR.mjs
var $a2f41026e05f1c84$exports = {};
$a2f41026e05f1c84$exports = {
  longPressMessage: "\u03A0\u03B9\u03AD\u03C3\u03C4\u03B5 \u03C0\u03B1\u03C1\u03B1\u03C4\u03B5\u03C4\u03B1\u03BC\u03AD\u03BD\u03B1 \u03AE \u03C0\u03B1\u03C4\u03AE\u03C3\u03C4\u03B5 Alt + \u03BA\u03AC\u03C4\u03C9 \u03B2\u03AD\u03BB\u03BF\u03C2 \u03B3\u03B9\u03B1 \u03BD\u03B1 \u03B1\u03BD\u03BF\u03AF\u03BE\u03B5\u03C4\u03B5 \u03C4\u03BF \u03BC\u03B5\u03BD\u03BF\u03CD"
};

// ../node_modules/@react-aria/menu/dist/en-US.mjs
var $43b800e97c901737$exports = {};
$43b800e97c901737$exports = {
  longPressMessage: "Long press or press Alt + ArrowDown to open menu"
};

// ../node_modules/@react-aria/menu/dist/es-ES.mjs
var $442f5f6ac211e29f$exports = {};
$442f5f6ac211e29f$exports = {
  longPressMessage: "Mantenga pulsado o pulse Alt + flecha abajo para abrir el men\xFA"
};

// ../node_modules/@react-aria/menu/dist/et-EE.mjs
var $dff280acfeb2d8ac$exports = {};
$dff280acfeb2d8ac$exports = {
  longPressMessage: "Men\xFC\xFC avamiseks vajutage pikalt v\xF5i vajutage klahve Alt + allanool"
};

// ../node_modules/@react-aria/menu/dist/fi-FI.mjs
var $51608325613944d7$exports = {};
$51608325613944d7$exports = {
  longPressMessage: "Avaa valikko painamalla pohjassa tai n\xE4pp\xE4inyhdistelm\xE4ll\xE4 Alt + Alanuoli"
};

// ../node_modules/@react-aria/menu/dist/fr-FR.mjs
var $c4a1b1eabeaa87be$exports = {};
$c4a1b1eabeaa87be$exports = {
  longPressMessage: "Appuyez de mani\xE8re prolong\xE9e ou appuyez sur Alt\xA0+\xA0Fl\xE8che vers le bas pour ouvrir le menu."
};

// ../node_modules/@react-aria/menu/dist/he-IL.mjs
var $8c74815cdee18d1b$exports = {};
$8c74815cdee18d1b$exports = {
  longPressMessage: "\u05DC\u05D7\u05E5 \u05DC\u05D7\u05D9\u05E6\u05D4 \u05D0\u05E8\u05D5\u05DB\u05D4 \u05D0\u05D5 \u05D4\u05E7\u05E9 Alt + ArrowDown \u05DB\u05D3\u05D9 \u05DC\u05E4\u05EA\u05D5\u05D7 \u05D0\u05EA \u05D4\u05EA\u05E4\u05E8\u05D9\u05D8"
};

// ../node_modules/@react-aria/menu/dist/hr-HR.mjs
var $fd0e9ef6a7fe0ec9$exports = {};
$fd0e9ef6a7fe0ec9$exports = {
  longPressMessage: "Dugo pritisnite ili pritisnite Alt + strelicu prema dolje za otvaranje izbornika"
};

// ../node_modules/@react-aria/menu/dist/hu-HU.mjs
var $a89a74a39eba465a$exports = {};
$a89a74a39eba465a$exports = {
  longPressMessage: "Nyomja meg hosszan, vagy nyomja meg az Alt + lefele ny\xEDl gombot a men\xFC megnyit\xE1s\xE1hoz"
};

// ../node_modules/@react-aria/menu/dist/it-IT.mjs
var $edc7c66594a0ae8a$exports = {};
$edc7c66594a0ae8a$exports = {
  longPressMessage: "Premere a lungo o premere Alt + Freccia gi\xF9 per aprire il menu"
};

// ../node_modules/@react-aria/menu/dist/ja-JP.mjs
var $f1ab51510712db52$exports = {};
$f1ab51510712db52$exports = {
  longPressMessage: "\u9577\u62BC\u3057\u307E\u305F\u306F Alt+\u4E0B\u77E2\u5370\u30AD\u30FC\u3067\u30E1\u30CB\u30E5\u30FC\u3092\u958B\u304F"
};

// ../node_modules/@react-aria/menu/dist/ko-KR.mjs
var $f9b672d9b82fa3d6$exports = {};
$f9b672d9b82fa3d6$exports = {
  longPressMessage: "\uAE38\uAC8C \uB204\uB974\uAC70\uB098 Alt + \uC544\uB798\uCABD \uD654\uC0B4\uD45C\uB97C \uB20C\uB7EC \uBA54\uB274 \uC5F4\uAE30"
};

// ../node_modules/@react-aria/menu/dist/lt-LT.mjs
var $a385f3910feda499$exports = {};
$a385f3910feda499$exports = {
  longPressMessage: "Nor\u0117dami atidaryti meniu, nuspaud\u0119 palaikykite arba paspauskite \u201EAlt + ArrowDown\u201C."
};

// ../node_modules/@react-aria/menu/dist/lv-LV.mjs
var $4f1bde932c441789$exports = {};
$4f1bde932c441789$exports = {
  longPressMessage: "Lai atv\u0113rtu izv\u0113lni, turiet nospiestu vai nospiediet tausti\u0146u kombin\u0101ciju Alt + lejupv\u0113rst\u0101 bulti\u0146a"
};

// ../node_modules/@react-aria/menu/dist/nb-NO.mjs
var $914a51a8a594d5be$exports = {};
$914a51a8a594d5be$exports = {
  longPressMessage: "Langt trykk eller trykk Alt + PilNed for \xE5 \xE5pne menyen"
};

// ../node_modules/@react-aria/menu/dist/nl-NL.mjs
var $89aaf803103bb500$exports = {};
$89aaf803103bb500$exports = {
  longPressMessage: "Druk lang op Alt + pijl-omlaag of druk op Alt om het menu te openen"
};

// ../node_modules/@react-aria/menu/dist/pl-PL.mjs
var $c685891476dbaaca$exports = {};
$c685891476dbaaca$exports = {
  longPressMessage: "Naci\u015Bnij i przytrzymaj lub naci\u015Bnij klawisze Alt + Strza\u0142ka w d\xF3\u0142, aby otworzy\u0107 menu"
};

// ../node_modules/@react-aria/menu/dist/pt-BR.mjs
var $885879b9b10c2959$exports = {};
$885879b9b10c2959$exports = {
  longPressMessage: "Pressione e segure ou pressione Alt + Seta para baixo para abrir o menu"
};

// ../node_modules/@react-aria/menu/dist/pt-PT.mjs
var $6b39616688a51692$exports = {};
$6b39616688a51692$exports = {
  longPressMessage: "Prima continuamente ou prima Alt + Seta Para Baixo para abrir o menu"
};

// ../node_modules/@react-aria/menu/dist/ro-RO.mjs
var $f26362aed63f47e2$exports = {};
$f26362aed63f47e2$exports = {
  longPressMessage: "Ap\u0103sa\u021Bi lung sau ap\u0103sa\u021Bi pe Alt + s\u0103geat\u0103 \xEEn jos pentru a deschide meniul"
};

// ../node_modules/@react-aria/menu/dist/ru-RU.mjs
var $06cbade644558bf0$exports = {};
$06cbade644558bf0$exports = {
  longPressMessage: "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0438 \u0443\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0439\u0442\u0435 \u0438\u043B\u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 Alt + \u0421\u0442\u0440\u0435\u043B\u043A\u0430 \u0432\u043D\u0438\u0437, \u0447\u0442\u043E\u0431\u044B \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u043C\u0435\u043D\u044E"
};

// ../node_modules/@react-aria/menu/dist/sk-SK.mjs
var $0a391ff68f9d59b1$exports = {};
$0a391ff68f9d59b1$exports = {
  longPressMessage: "Ponuku otvor\xEDte dlh\xFDm stla\u010Den\xEDm alebo stla\u010Den\xEDm kl\xE1vesu Alt + kl\xE1vesu so \u0161\xEDpkou nadol"
};

// ../node_modules/@react-aria/menu/dist/sl-SI.mjs
var $8193cf0e649c7928$exports = {};
$8193cf0e649c7928$exports = {
  longPressMessage: "Za odprtje menija pritisnite in dr\u017Eite gumb ali pritisnite Alt+pu\u0161\u010Dica navzdol"
};

// ../node_modules/@react-aria/menu/dist/sr-SP.mjs
var $f398debcce5a5c55$exports = {};
$f398debcce5a5c55$exports = {
  longPressMessage: "Dugo pritisnite ili pritisnite Alt + strelicu prema dole da otvorite meni"
};

// ../node_modules/@react-aria/menu/dist/sv-SE.mjs
var $9e9fef000aa4c013$exports = {};
$9e9fef000aa4c013$exports = {
  longPressMessage: "H\xE5ll nedtryckt eller tryck p\xE5 Alt + pil ned\xE5t f\xF6r att \xF6ppna menyn"
};

// ../node_modules/@react-aria/menu/dist/tr-TR.mjs
var $c016c8183bbe3d68$exports = {};
$c016c8183bbe3d68$exports = {
  longPressMessage: "Men\xFCy\xFC a\xE7mak i\xE7in uzun bas\u0131n veya Alt + A\u015Fa\u011F\u0131 Ok tu\u015Funa bas\u0131n"
};

// ../node_modules/@react-aria/menu/dist/uk-UA.mjs
var $ca4f6c8462244e62$exports = {};
$ca4f6c8462244e62$exports = {
  longPressMessage: "\u0414\u043E\u0432\u0433\u043E \u0430\u0431\u043E \u0437\u0432\u0438\u0447\u0430\u0439\u043D\u043E \u043D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \u043A\u043E\u043C\u0431\u0456\u043D\u0430\u0446\u0456\u044E \u043A\u043B\u0430\u0432\u0456\u0448 Alt \u0456 \u0441\u0442\u0440\u0456\u043B\u043A\u0430 \u0432\u043D\u0438\u0437, \u0449\u043E\u0431 \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u043C\u0435\u043D\u044E"
};

// ../node_modules/@react-aria/menu/dist/zh-CN.mjs
var $2d9960c02ccac927$exports = {};
$2d9960c02ccac927$exports = {
  longPressMessage: "\u957F\u6309\u6216\u6309 Alt + \u5411\u4E0B\u65B9\u5411\u952E\u4EE5\u6253\u5F00\u83DC\u5355"
};

// ../node_modules/@react-aria/menu/dist/zh-TW.mjs
var $f1b682a4c8c5631c$exports = {};
$f1b682a4c8c5631c$exports = {
  longPressMessage: "\u9577\u6309\u6216\u6309 Alt+\u5411\u4E0B\u9375\u4EE5\u958B\u555F\u529F\u80FD\u8868"
};

// ../node_modules/@react-aria/menu/dist/intlStrings.mjs
var $2cbb7ca666678a14$exports = {};
$2cbb7ca666678a14$exports = {
  "ar-AE": $c0398ad35c3639b7$exports,
  "bg-BG": $7af657c4165927c3$exports,
  "cs-CZ": $d95d4da6d531ab81$exports,
  "da-DK": $24ebda9c775dca17$exports,
  "de-DE": $743e0dfca6cab1e9$exports,
  "el-GR": $a2f41026e05f1c84$exports,
  "en-US": $43b800e97c901737$exports,
  "es-ES": $442f5f6ac211e29f$exports,
  "et-EE": $dff280acfeb2d8ac$exports,
  "fi-FI": $51608325613944d7$exports,
  "fr-FR": $c4a1b1eabeaa87be$exports,
  "he-IL": $8c74815cdee18d1b$exports,
  "hr-HR": $fd0e9ef6a7fe0ec9$exports,
  "hu-HU": $a89a74a39eba465a$exports,
  "it-IT": $edc7c66594a0ae8a$exports,
  "ja-JP": $f1ab51510712db52$exports,
  "ko-KR": $f9b672d9b82fa3d6$exports,
  "lt-LT": $a385f3910feda499$exports,
  "lv-LV": $4f1bde932c441789$exports,
  "nb-NO": $914a51a8a594d5be$exports,
  "nl-NL": $89aaf803103bb500$exports,
  "pl-PL": $c685891476dbaaca$exports,
  "pt-BR": $885879b9b10c2959$exports,
  "pt-PT": $6b39616688a51692$exports,
  "ro-RO": $f26362aed63f47e2$exports,
  "ru-RU": $06cbade644558bf0$exports,
  "sk-SK": $0a391ff68f9d59b1$exports,
  "sl-SI": $8193cf0e649c7928$exports,
  "sr-SP": $f398debcce5a5c55$exports,
  "sv-SE": $9e9fef000aa4c013$exports,
  "tr-TR": $c016c8183bbe3d68$exports,
  "uk-UA": $ca4f6c8462244e62$exports,
  "zh-CN": $2d9960c02ccac927$exports,
  "zh-TW": $f1b682a4c8c5631c$exports
};

// ../node_modules/@react-aria/menu/dist/utils.mjs
var $fc79756100351201$export$6f49b4016bfc8d56 = /* @__PURE__ */ new WeakMap();

// ../node_modules/@react-aria/selection/dist/utils.mjs
function $feb5ffebff200149$export$d3e3bd3e26688c04(e) {
  return $c87311424ea30a05$export$e1865c3bedcd822b() ? e.altKey : e.ctrlKey;
}
function $feb5ffebff200149$export$c3d8340acf92597f(collectionRef, key) {
  var _collectionRef_current, _collectionRef_current1;
  let selector = `[data-key="${CSS.escape(String(key))}"]`, collection = (_collectionRef_current = collectionRef.current) === null || _collectionRef_current === void 0 ? void 0 : _collectionRef_current.dataset.collection;
  return collection && (selector = `[data-collection="${CSS.escape(collection)}"]${selector}`), (_collectionRef_current1 = collectionRef.current) === null || _collectionRef_current1 === void 0 ? void 0 : _collectionRef_current1.querySelector(selector);
}
var $feb5ffebff200149$var$collectionMap = /* @__PURE__ */ new WeakMap();
function $feb5ffebff200149$export$881eb0d9f3605d9d(collection) {
  let id = $bdb11010cef70236$export$f680877a34711e37();
  return $feb5ffebff200149$var$collectionMap.set(collection, id), id;
}
function $feb5ffebff200149$export$6aeb1680a0ae8741(collection) {
  return $feb5ffebff200149$var$collectionMap.get(collection);
}

// ../node_modules/@react-aria/selection/dist/useTypeSelect.mjs
import { useRef as $dAE4Y$useRef } from "react";
var $fb3050f43d946246$var$TYPEAHEAD_DEBOUNCE_WAIT_MS = 1e3;
function $fb3050f43d946246$export$e32c88dfddc6e1d8(options) {
  let { keyboardDelegate, selectionManager, onTypeSelect } = options, state = $dAE4Y$useRef({
    search: "",
    timeout: void 0
  }).current, onKeyDown = (e) => {
    let character = $fb3050f43d946246$var$getStringForKey(e.key);
    if (!(!character || e.ctrlKey || e.metaKey || !e.currentTarget.contains(e.target) || state.search.length === 0 && character === " ")) {
      if (character === " " && state.search.trim().length > 0 && (e.preventDefault(), "continuePropagation" in e || e.stopPropagation()), state.search += character, keyboardDelegate.getKeyForSearch != null) {
        let key = keyboardDelegate.getKeyForSearch(state.search, selectionManager.focusedKey);
        key == null && (key = keyboardDelegate.getKeyForSearch(state.search)), key != null && (selectionManager.setFocusedKey(key), onTypeSelect && onTypeSelect(key));
      }
      clearTimeout(state.timeout), state.timeout = setTimeout(() => {
        state.search = "";
      }, $fb3050f43d946246$var$TYPEAHEAD_DEBOUNCE_WAIT_MS);
    }
  };
  return {
    typeSelectProps: {
      // Using a capturing listener to catch the keydown event before
      // other hooks in order to handle the Spacebar event.
      onKeyDownCapture: keyboardDelegate.getKeyForSearch ? onKeyDown : void 0
    }
  };
}
function $fb3050f43d946246$var$getStringForKey(key) {
  return key.length === 1 || !/^[A-Z]/i.test(key) ? key : "";
}

// ../node_modules/@react-aria/selection/dist/useSelectableCollection.mjs
import { flushSync as $3H3GQ$flushSync } from "react-dom";
import { useRef as $3H3GQ$useRef, useEffect as $3H3GQ$useEffect } from "react";
function $ae20dd8cbca75726$export$d6daf82dcd84e87c(options) {
  let { selectionManager: manager, keyboardDelegate: delegate, ref, autoFocus = !1, shouldFocusWrap = !1, disallowEmptySelection = !1, disallowSelectAll = !1, escapeKeyBehavior = "clearSelection", selectOnFocus = manager.selectionBehavior === "replace", disallowTypeAhead = !1, shouldUseVirtualFocus, allowsTabNavigation = !1, isVirtualized, scrollRef = ref, linkBehavior = "action" } = options, { direction } = $18f2051aff69b9bf$export$43bb16f9c6d9e3f7(), router = $ea8dcbcb9ea1b556$export$9a302a45f65d0572(), onKeyDown = (e) => {
    var _ref_current;
    if (e.altKey && e.key === "Tab" && e.preventDefault(), !(!((_ref_current = ref.current) === null || _ref_current === void 0) && _ref_current.contains(e.target))) return;
    let navigateToKey = (key, childFocus) => {
      if (key != null) {
        if (manager.isLink(key) && linkBehavior === "selection" && selectOnFocus && !$feb5ffebff200149$export$d3e3bd3e26688c04(e)) {
          $3H3GQ$flushSync(() => {
            manager.setFocusedKey(key, childFocus);
          });
          let item = $feb5ffebff200149$export$c3d8340acf92597f(ref, key), itemProps = manager.getItemProps(key);
          item && router.open(item, e, itemProps.href, itemProps.routerOptions);
          return;
        }
        if (manager.setFocusedKey(key, childFocus), manager.isLink(key) && linkBehavior === "override") return;
        e.shiftKey && manager.selectionMode === "multiple" ? manager.extendSelection(key) : selectOnFocus && !$feb5ffebff200149$export$d3e3bd3e26688c04(e) && manager.replaceSelection(key);
      }
    };
    switch (e.key) {
      case "ArrowDown":
        if (delegate.getKeyBelow) {
          var _delegate_getKeyBelow, _delegate_getFirstKey, _delegate_getFirstKey1;
          let nextKey = manager.focusedKey != null ? (_delegate_getKeyBelow = delegate.getKeyBelow) === null || _delegate_getKeyBelow === void 0 ? void 0 : _delegate_getKeyBelow.call(delegate, manager.focusedKey) : (_delegate_getFirstKey = delegate.getFirstKey) === null || _delegate_getFirstKey === void 0 ? void 0 : _delegate_getFirstKey.call(delegate);
          nextKey == null && shouldFocusWrap && (nextKey = (_delegate_getFirstKey1 = delegate.getFirstKey) === null || _delegate_getFirstKey1 === void 0 ? void 0 : _delegate_getFirstKey1.call(delegate, manager.focusedKey)), nextKey != null && (e.preventDefault(), navigateToKey(nextKey));
        }
        break;
      case "ArrowUp":
        if (delegate.getKeyAbove) {
          var _delegate_getKeyAbove, _delegate_getLastKey, _delegate_getLastKey1;
          let nextKey = manager.focusedKey != null ? (_delegate_getKeyAbove = delegate.getKeyAbove) === null || _delegate_getKeyAbove === void 0 ? void 0 : _delegate_getKeyAbove.call(delegate, manager.focusedKey) : (_delegate_getLastKey = delegate.getLastKey) === null || _delegate_getLastKey === void 0 ? void 0 : _delegate_getLastKey.call(delegate);
          nextKey == null && shouldFocusWrap && (nextKey = (_delegate_getLastKey1 = delegate.getLastKey) === null || _delegate_getLastKey1 === void 0 ? void 0 : _delegate_getLastKey1.call(delegate, manager.focusedKey)), nextKey != null && (e.preventDefault(), navigateToKey(nextKey));
        }
        break;
      case "ArrowLeft":
        if (delegate.getKeyLeftOf) {
          var _delegate_getKeyLeftOf, _delegate_getFirstKey2, _delegate_getLastKey2;
          let nextKey = manager.focusedKey != null ? (_delegate_getKeyLeftOf = delegate.getKeyLeftOf) === null || _delegate_getKeyLeftOf === void 0 ? void 0 : _delegate_getKeyLeftOf.call(delegate, manager.focusedKey) : null;
          nextKey == null && shouldFocusWrap && (nextKey = direction === "rtl" ? (_delegate_getFirstKey2 = delegate.getFirstKey) === null || _delegate_getFirstKey2 === void 0 ? void 0 : _delegate_getFirstKey2.call(delegate, manager.focusedKey) : (_delegate_getLastKey2 = delegate.getLastKey) === null || _delegate_getLastKey2 === void 0 ? void 0 : _delegate_getLastKey2.call(delegate, manager.focusedKey)), nextKey != null && (e.preventDefault(), navigateToKey(nextKey, direction === "rtl" ? "first" : "last"));
        }
        break;
      case "ArrowRight":
        if (delegate.getKeyRightOf) {
          var _delegate_getKeyRightOf, _delegate_getLastKey3, _delegate_getFirstKey3;
          let nextKey = manager.focusedKey != null ? (_delegate_getKeyRightOf = delegate.getKeyRightOf) === null || _delegate_getKeyRightOf === void 0 ? void 0 : _delegate_getKeyRightOf.call(delegate, manager.focusedKey) : null;
          nextKey == null && shouldFocusWrap && (nextKey = direction === "rtl" ? (_delegate_getLastKey3 = delegate.getLastKey) === null || _delegate_getLastKey3 === void 0 ? void 0 : _delegate_getLastKey3.call(delegate, manager.focusedKey) : (_delegate_getFirstKey3 = delegate.getFirstKey) === null || _delegate_getFirstKey3 === void 0 ? void 0 : _delegate_getFirstKey3.call(delegate, manager.focusedKey)), nextKey != null && (e.preventDefault(), navigateToKey(nextKey, direction === "rtl" ? "last" : "first"));
        }
        break;
      case "Home":
        if (delegate.getFirstKey) {
          if (manager.focusedKey === null && e.shiftKey) return;
          e.preventDefault();
          let firstKey = delegate.getFirstKey(manager.focusedKey, $21f1aa98acb08317$export$16792effe837dba3(e));
          manager.setFocusedKey(firstKey), firstKey != null && ($21f1aa98acb08317$export$16792effe837dba3(e) && e.shiftKey && manager.selectionMode === "multiple" ? manager.extendSelection(firstKey) : selectOnFocus && manager.replaceSelection(firstKey));
        }
        break;
      case "End":
        if (delegate.getLastKey) {
          if (manager.focusedKey === null && e.shiftKey) return;
          e.preventDefault();
          let lastKey = delegate.getLastKey(manager.focusedKey, $21f1aa98acb08317$export$16792effe837dba3(e));
          manager.setFocusedKey(lastKey), lastKey != null && ($21f1aa98acb08317$export$16792effe837dba3(e) && e.shiftKey && manager.selectionMode === "multiple" ? manager.extendSelection(lastKey) : selectOnFocus && manager.replaceSelection(lastKey));
        }
        break;
      case "PageDown":
        if (delegate.getKeyPageBelow && manager.focusedKey != null) {
          let nextKey = delegate.getKeyPageBelow(manager.focusedKey);
          nextKey != null && (e.preventDefault(), navigateToKey(nextKey));
        }
        break;
      case "PageUp":
        if (delegate.getKeyPageAbove && manager.focusedKey != null) {
          let nextKey = delegate.getKeyPageAbove(manager.focusedKey);
          nextKey != null && (e.preventDefault(), navigateToKey(nextKey));
        }
        break;
      case "a":
        $21f1aa98acb08317$export$16792effe837dba3(e) && manager.selectionMode === "multiple" && disallowSelectAll !== !0 && (e.preventDefault(), manager.selectAll());
        break;
      case "Escape":
        escapeKeyBehavior === "clearSelection" && !disallowEmptySelection && manager.selectedKeys.size !== 0 && (e.stopPropagation(), e.preventDefault(), manager.clearSelection());
        break;
      case "Tab":
        if (!allowsTabNavigation) {
          if (e.shiftKey) ref.current.focus();
          else {
            let walker = $9bf71ea28793e738$export$2d6ec8fc375ceafa(ref.current, {
              tabbable: !0
            }), next, last;
            do
              last = walker.lastChild(), last && (next = last);
            while (last);
            next && !next.contains(document.activeElement) && $7215afc6de606d6b$export$de79e2c695e052f3(next);
          }
          break;
        }
    }
  }, scrollPos = $3H3GQ$useRef({
    top: 0,
    left: 0
  });
  $e9faafb641e167db$export$90fc3a17d93f704c(scrollRef, "scroll", isVirtualized ? void 0 : () => {
    var _scrollRef_current, _scrollRef_current1, _scrollRef_current_scrollTop, _scrollRef_current_scrollLeft;
    scrollPos.current = {
      top: (_scrollRef_current_scrollTop = (_scrollRef_current = scrollRef.current) === null || _scrollRef_current === void 0 ? void 0 : _scrollRef_current.scrollTop) !== null && _scrollRef_current_scrollTop !== void 0 ? _scrollRef_current_scrollTop : 0,
      left: (_scrollRef_current_scrollLeft = (_scrollRef_current1 = scrollRef.current) === null || _scrollRef_current1 === void 0 ? void 0 : _scrollRef_current1.scrollLeft) !== null && _scrollRef_current_scrollLeft !== void 0 ? _scrollRef_current_scrollLeft : 0
    };
  });
  let onFocus = (e) => {
    if (manager.isFocused) {
      e.currentTarget.contains(e.target) || manager.setFocused(!1);
      return;
    }
    if (e.currentTarget.contains(e.target)) {
      if (manager.setFocused(!0), manager.focusedKey == null) {
        var _delegate_getLastKey, _delegate_getFirstKey;
        let navigateToKey = (key) => {
          key != null && (manager.setFocusedKey(key), selectOnFocus && !manager.isSelected(key) && manager.replaceSelection(key));
        }, relatedTarget = e.relatedTarget;
        var _manager_lastSelectedKey, _manager_firstSelectedKey;
        relatedTarget && e.currentTarget.compareDocumentPosition(relatedTarget) & Node.DOCUMENT_POSITION_FOLLOWING ? navigateToKey((_manager_lastSelectedKey = manager.lastSelectedKey) !== null && _manager_lastSelectedKey !== void 0 ? _manager_lastSelectedKey : (_delegate_getLastKey = delegate.getLastKey) === null || _delegate_getLastKey === void 0 ? void 0 : _delegate_getLastKey.call(delegate)) : navigateToKey((_manager_firstSelectedKey = manager.firstSelectedKey) !== null && _manager_firstSelectedKey !== void 0 ? _manager_firstSelectedKey : (_delegate_getFirstKey = delegate.getFirstKey) === null || _delegate_getFirstKey === void 0 ? void 0 : _delegate_getFirstKey.call(delegate));
      } else !isVirtualized && scrollRef.current && (scrollRef.current.scrollTop = scrollPos.current.top, scrollRef.current.scrollLeft = scrollPos.current.left);
      if (manager.focusedKey != null && scrollRef.current) {
        let element = $feb5ffebff200149$export$c3d8340acf92597f(ref, manager.focusedKey);
        element instanceof HTMLElement && (!element.contains(document.activeElement) && !shouldUseVirtualFocus && $7215afc6de606d6b$export$de79e2c695e052f3(element), $507fabe10e71c6fb$export$630ff653c5ada6a9() === "keyboard" && $2f04cbc44ee30ce0$export$c826860796309d1b(element, {
          containingElement: ref.current
        }));
      }
    }
  }, onBlur = (e) => {
    e.currentTarget.contains(e.relatedTarget) || manager.setFocused(!1);
  }, shouldVirtualFocusFirst = $3H3GQ$useRef(!1);
  $e9faafb641e167db$export$90fc3a17d93f704c(ref, $5671b20cf9b562b2$export$831c820ad60f9d12, shouldUseVirtualFocus ? (e) => {
    let { detail } = e;
    e.stopPropagation(), manager.setFocused(!0), detail?.focusStrategy === "first" && (shouldVirtualFocusFirst.current = !0);
  } : void 0);
  let updateActiveDescendant = $8ae05eaa5c114e9c$export$7f54fc3180508a52(() => {
    var _delegate_getFirstKey, _delegate_getFirstKey1;
    let keyToFocus = (_delegate_getFirstKey1 = (_delegate_getFirstKey = delegate.getFirstKey) === null || _delegate_getFirstKey === void 0 ? void 0 : _delegate_getFirstKey.call(delegate)) !== null && _delegate_getFirstKey1 !== void 0 ? _delegate_getFirstKey1 : null;
    if (keyToFocus == null) {
      let previousActiveElement = $d4ee10de306f2510$export$cd4e5573fbe2b576();
      $55f9b1ae81f22853$export$76e4e37e5339496d(ref.current), $55f9b1ae81f22853$export$2b35b76d2e30e129(previousActiveElement, null), manager.collection.size > 0 && (shouldVirtualFocusFirst.current = !1);
    } else
      manager.setFocusedKey(keyToFocus), shouldVirtualFocusFirst.current = !1;
  });
  $ca9b37712f007381$export$72ef708ab07251f1(() => {
    shouldVirtualFocusFirst.current && updateActiveDescendant();
  }, [
    manager.collection,
    updateActiveDescendant
  ]);
  let resetFocusFirstFlag = $8ae05eaa5c114e9c$export$7f54fc3180508a52(() => {
    manager.collection.size > 0 && (shouldVirtualFocusFirst.current = !1);
  });
  $ca9b37712f007381$export$72ef708ab07251f1(() => {
    resetFocusFirstFlag();
  }, [
    manager.focusedKey,
    resetFocusFirstFlag
  ]), $e9faafb641e167db$export$90fc3a17d93f704c(ref, $5671b20cf9b562b2$export$447a38995de2c711, shouldUseVirtualFocus ? (e) => {
    var _e_detail;
    e.stopPropagation(), manager.setFocused(!1), !((_e_detail = e.detail) === null || _e_detail === void 0) && _e_detail.clearFocusKey && manager.setFocusedKey(null);
  } : void 0);
  let autoFocusRef = $3H3GQ$useRef(autoFocus), didAutoFocusRef = $3H3GQ$useRef(!1);
  $3H3GQ$useEffect(() => {
    if (autoFocusRef.current) {
      var _delegate_getFirstKey, _delegate_getLastKey;
      let focusedKey = null;
      var _delegate_getFirstKey1;
      autoFocus === "first" && (focusedKey = (_delegate_getFirstKey1 = (_delegate_getFirstKey = delegate.getFirstKey) === null || _delegate_getFirstKey === void 0 ? void 0 : _delegate_getFirstKey.call(delegate)) !== null && _delegate_getFirstKey1 !== void 0 ? _delegate_getFirstKey1 : null);
      var _delegate_getLastKey1;
      autoFocus === "last" && (focusedKey = (_delegate_getLastKey1 = (_delegate_getLastKey = delegate.getLastKey) === null || _delegate_getLastKey === void 0 ? void 0 : _delegate_getLastKey.call(delegate)) !== null && _delegate_getLastKey1 !== void 0 ? _delegate_getLastKey1 : null);
      let selectedKeys = manager.selectedKeys;
      if (selectedKeys.size) {
        for (let key of selectedKeys) if (manager.canSelectItem(key)) {
          focusedKey = key;
          break;
        }
      }
      manager.setFocused(!0), manager.setFocusedKey(focusedKey), focusedKey == null && !shouldUseVirtualFocus && ref.current && $3ad3f6e1647bc98d$export$80f3e147d781571c(ref.current), manager.collection.size > 0 && (autoFocusRef.current = !1, didAutoFocusRef.current = !0);
    }
  });
  let lastFocusedKey = $3H3GQ$useRef(manager.focusedKey), raf = $3H3GQ$useRef(null);
  $3H3GQ$useEffect(() => {
    if (manager.isFocused && manager.focusedKey != null && (manager.focusedKey !== lastFocusedKey.current || didAutoFocusRef.current) && scrollRef.current && ref.current) {
      let modality = $507fabe10e71c6fb$export$630ff653c5ada6a9(), element = $feb5ffebff200149$export$c3d8340acf92597f(ref, manager.focusedKey);
      if (!(element instanceof HTMLElement))
        return;
      (modality === "keyboard" || didAutoFocusRef.current) && (raf.current && cancelAnimationFrame(raf.current), raf.current = requestAnimationFrame(() => {
        scrollRef.current && ($2f04cbc44ee30ce0$export$53a0910f038337bd(scrollRef.current, element), modality !== "virtual" && $2f04cbc44ee30ce0$export$c826860796309d1b(element, {
          containingElement: ref.current
        }));
      }));
    }
    !shouldUseVirtualFocus && manager.isFocused && manager.focusedKey == null && lastFocusedKey.current != null && ref.current && $3ad3f6e1647bc98d$export$80f3e147d781571c(ref.current), lastFocusedKey.current = manager.focusedKey, didAutoFocusRef.current = !1;
  }), $3H3GQ$useEffect(() => () => {
    raf.current && cancelAnimationFrame(raf.current);
  }, []), $e9faafb641e167db$export$90fc3a17d93f704c(ref, "react-aria-focus-scope-restore", (e) => {
    e.preventDefault(), manager.setFocused(!0);
  });
  let handlers = {
    onKeyDown,
    onFocus,
    onBlur,
    onMouseDown(e) {
      scrollRef.current === e.target && e.preventDefault();
    }
  }, { typeSelectProps } = $fb3050f43d946246$export$e32c88dfddc6e1d8({
    keyboardDelegate: delegate,
    selectionManager: manager
  });
  disallowTypeAhead || (handlers = $3ef42575df84b30b$export$9d1611c77c2fe928(typeSelectProps, handlers));
  let tabIndex;
  shouldUseVirtualFocus || (tabIndex = manager.focusedKey == null ? 0 : -1);
  let collectionId = $feb5ffebff200149$export$881eb0d9f3605d9d(manager.collection);
  return {
    collectionProps: $3ef42575df84b30b$export$9d1611c77c2fe928(handlers, {
      tabIndex,
      "data-collection": collectionId
    })
  };
}

// ../node_modules/@react-aria/selection/dist/useSelectableItem.mjs
import { useEffect as $581M0$useEffect, useRef as $581M0$useRef } from "react";
function $880e95eb8b93ba9a$export$ecf600387e221c37(options) {
  let { id, selectionManager: manager, key, ref, shouldSelectOnPressUp, shouldUseVirtualFocus, focus, isDisabled, onAction, allowsDifferentPressOrigin, linkBehavior = "action" } = options, router = $ea8dcbcb9ea1b556$export$9a302a45f65d0572();
  id = $bdb11010cef70236$export$f680877a34711e37(id);
  let onSelect = (e) => {
    if (e.pointerType === "keyboard" && $feb5ffebff200149$export$d3e3bd3e26688c04(e)) manager.toggleSelection(key);
    else {
      if (manager.selectionMode === "none") return;
      if (manager.isLink(key)) {
        if (linkBehavior === "selection" && ref.current) {
          let itemProps2 = manager.getItemProps(key);
          router.open(ref.current, e, itemProps2.href, itemProps2.routerOptions), manager.setSelectedKeys(manager.selectedKeys);
          return;
        } else if (linkBehavior === "override" || linkBehavior === "none") return;
      }
      manager.selectionMode === "single" ? manager.isSelected(key) && !manager.disallowEmptySelection ? manager.toggleSelection(key) : manager.replaceSelection(key) : e && e.shiftKey ? manager.extendSelection(key) : manager.selectionBehavior === "toggle" || e && ($21f1aa98acb08317$export$16792effe837dba3(e) || e.pointerType === "touch" || e.pointerType === "virtual") ? manager.toggleSelection(key) : manager.replaceSelection(key);
    }
  };
  $581M0$useEffect(() => {
    key === manager.focusedKey && manager.isFocused && (shouldUseVirtualFocus ? $55f9b1ae81f22853$export$76e4e37e5339496d(ref.current) : focus ? focus() : document.activeElement !== ref.current && ref.current && $3ad3f6e1647bc98d$export$80f3e147d781571c(ref.current));
  }, [
    ref,
    key,
    manager.focusedKey,
    manager.childFocusStrategy,
    manager.isFocused,
    shouldUseVirtualFocus
  ]), isDisabled = isDisabled || manager.isDisabled(key);
  let itemProps = {};
  !shouldUseVirtualFocus && !isDisabled ? itemProps = {
    tabIndex: key === manager.focusedKey ? 0 : -1,
    onFocus(e) {
      e.target === ref.current && manager.setFocusedKey(key);
    }
  } : isDisabled && (itemProps.onMouseDown = (e) => {
    e.preventDefault();
  });
  let isLinkOverride = manager.isLink(key) && linkBehavior === "override", isActionOverride = onAction && options.UNSTABLE_itemBehavior === "action", hasLinkAction = manager.isLink(key) && linkBehavior !== "selection" && linkBehavior !== "none", allowsSelection = !isDisabled && manager.canSelectItem(key) && !isLinkOverride && !isActionOverride, allowsActions = (onAction || hasLinkAction) && !isDisabled, hasPrimaryAction = allowsActions && (manager.selectionBehavior === "replace" ? !allowsSelection : !allowsSelection || manager.isEmpty), hasSecondaryAction = allowsActions && allowsSelection && manager.selectionBehavior === "replace", hasAction = hasPrimaryAction || hasSecondaryAction, modality = $581M0$useRef(null), longPressEnabled = hasAction && allowsSelection, longPressEnabledOnPressStart = $581M0$useRef(!1), hadPrimaryActionOnPressStart = $581M0$useRef(!1), collectionItemProps = manager.getItemProps(key), performAction = (e) => {
    if (onAction) {
      var _ref_current;
      onAction(), (_ref_current = ref.current) === null || _ref_current === void 0 || _ref_current.dispatchEvent(new CustomEvent("react-aria-item-action", {
        bubbles: !0
      }));
    }
    hasLinkAction && ref.current && router.open(ref.current, e, collectionItemProps.href, collectionItemProps.routerOptions);
  }, itemPressProps = {
    ref
  };
  if (shouldSelectOnPressUp ? (itemPressProps.onPressStart = (e) => {
    modality.current = e.pointerType, longPressEnabledOnPressStart.current = longPressEnabled, e.pointerType === "keyboard" && (!hasAction || $880e95eb8b93ba9a$var$isSelectionKey()) && onSelect(e);
  }, allowsDifferentPressOrigin ? (itemPressProps.onPressUp = hasPrimaryAction ? void 0 : (e) => {
    e.pointerType === "mouse" && allowsSelection && onSelect(e);
  }, itemPressProps.onPress = hasPrimaryAction ? performAction : (e) => {
    e.pointerType !== "keyboard" && e.pointerType !== "mouse" && allowsSelection && onSelect(e);
  }) : itemPressProps.onPress = (e) => {
    if (hasPrimaryAction || hasSecondaryAction && e.pointerType !== "mouse") {
      if (e.pointerType === "keyboard" && !$880e95eb8b93ba9a$var$isActionKey()) return;
      performAction(e);
    } else e.pointerType !== "keyboard" && allowsSelection && onSelect(e);
  }) : (itemPressProps.onPressStart = (e) => {
    modality.current = e.pointerType, longPressEnabledOnPressStart.current = longPressEnabled, hadPrimaryActionOnPressStart.current = hasPrimaryAction, allowsSelection && (e.pointerType === "mouse" && !hasPrimaryAction || e.pointerType === "keyboard" && (!allowsActions || $880e95eb8b93ba9a$var$isSelectionKey())) && onSelect(e);
  }, itemPressProps.onPress = (e) => {
    (e.pointerType === "touch" || e.pointerType === "pen" || e.pointerType === "virtual" || e.pointerType === "keyboard" && hasAction && $880e95eb8b93ba9a$var$isActionKey() || e.pointerType === "mouse" && hadPrimaryActionOnPressStart.current) && (hasAction ? performAction(e) : allowsSelection && onSelect(e));
  }), itemProps["data-collection"] = $feb5ffebff200149$export$6aeb1680a0ae8741(manager.collection), itemProps["data-key"] = key, itemPressProps.preventFocusOnPress = shouldUseVirtualFocus, shouldUseVirtualFocus && (itemPressProps = $3ef42575df84b30b$export$9d1611c77c2fe928(itemPressProps, {
    onPressStart(e) {
      e.pointerType !== "touch" && (manager.setFocused(!0), manager.setFocusedKey(key));
    },
    onPress(e) {
      e.pointerType === "touch" && (manager.setFocused(!0), manager.setFocusedKey(key));
    }
  })), collectionItemProps)
    for (let key2 of [
      "onPressStart",
      "onPressEnd",
      "onPressChange",
      "onPress",
      "onPressUp",
      "onClick"
    ]) collectionItemProps[key2] && (itemPressProps[key2] = $ff5963eb1fccf552$export$e08e3b67e392101e(itemPressProps[key2], collectionItemProps[key2]));
  let { pressProps, isPressed } = $f6c31cce2adf654f$export$45712eceda6fad21(itemPressProps), onDoubleClick = hasSecondaryAction ? (e) => {
    modality.current === "mouse" && (e.stopPropagation(), e.preventDefault(), performAction(e));
  } : void 0, { longPressProps } = $8a26561d2877236e$export$c24ed0104d07eab9({
    isDisabled: !longPressEnabled,
    onLongPress(e) {
      e.pointerType === "touch" && (onSelect(e), manager.setSelectionBehavior("toggle"));
    }
  }), onDragStartCapture = (e) => {
    modality.current === "touch" && longPressEnabledOnPressStart.current && e.preventDefault();
  }, onClick = linkBehavior !== "none" && manager.isLink(key) ? (e) => {
    $ea8dcbcb9ea1b556$export$95185d699e05d4d7.isOpening || e.preventDefault();
  } : void 0;
  return {
    itemProps: $3ef42575df84b30b$export$9d1611c77c2fe928(
      itemProps,
      allowsSelection || hasPrimaryAction || shouldUseVirtualFocus && !isDisabled ? pressProps : {},
      longPressEnabled ? longPressProps : {},
      {
        onDoubleClick,
        onDragStartCapture,
        onClick,
        id
      },
      // Prevent DOM focus from moving on mouse down when using virtual focus
      shouldUseVirtualFocus ? {
        onMouseDown: (e) => e.preventDefault()
      } : void 0
    ),
    isPressed,
    isSelected: manager.isSelected(key),
    isFocused: manager.isFocused && manager.focusedKey === key,
    isDisabled,
    allowsSelection,
    hasAction
  };
}
function $880e95eb8b93ba9a$var$isActionKey() {
  let event = window.event;
  return event?.key === "Enter";
}
function $880e95eb8b93ba9a$var$isSelectionKey() {
  let event = window.event;
  return event?.key === " " || event?.code === "Space";
}

// ../node_modules/@react-aria/selection/dist/DOMLayoutDelegate.mjs
var $657e4dc4a6e88df0$export$8f5ed9ff9f511381 = class {
  getItemRect(key) {
    let container = this.ref.current;
    if (!container) return null;
    let item = key != null ? $feb5ffebff200149$export$c3d8340acf92597f(this.ref, key) : null;
    if (!item) return null;
    let containerRect = container.getBoundingClientRect(), itemRect = item.getBoundingClientRect();
    return {
      x: itemRect.left - containerRect.left - container.clientLeft + container.scrollLeft,
      y: itemRect.top - containerRect.top - container.clientTop + container.scrollTop,
      width: itemRect.width,
      height: itemRect.height
    };
  }
  getContentSize() {
    let container = this.ref.current;
    var _container_scrollWidth, _container_scrollHeight;
    return {
      width: (_container_scrollWidth = container?.scrollWidth) !== null && _container_scrollWidth !== void 0 ? _container_scrollWidth : 0,
      height: (_container_scrollHeight = container?.scrollHeight) !== null && _container_scrollHeight !== void 0 ? _container_scrollHeight : 0
    };
  }
  getVisibleRect() {
    let container = this.ref.current;
    var _container_scrollLeft, _container_scrollTop, _container_clientWidth, _container_clientHeight;
    return {
      x: (_container_scrollLeft = container?.scrollLeft) !== null && _container_scrollLeft !== void 0 ? _container_scrollLeft : 0,
      y: (_container_scrollTop = container?.scrollTop) !== null && _container_scrollTop !== void 0 ? _container_scrollTop : 0,
      width: (_container_clientWidth = container?.clientWidth) !== null && _container_clientWidth !== void 0 ? _container_clientWidth : 0,
      height: (_container_clientHeight = container?.clientHeight) !== null && _container_clientHeight !== void 0 ? _container_clientHeight : 0
    };
  }
  constructor(ref) {
    this.ref = ref;
  }
};

// ../node_modules/@react-aria/selection/dist/ListKeyboardDelegate.mjs
var $2a25aae57d74318e$export$a05409b8bb224a5a = class {
  isDisabled(item) {
    var _item_props;
    return this.disabledBehavior === "all" && (((_item_props = item.props) === null || _item_props === void 0 ? void 0 : _item_props.isDisabled) || this.disabledKeys.has(item.key));
  }
  findNextNonDisabled(key, getNext) {
    let nextKey = key;
    for (; nextKey != null; ) {
      let item = this.collection.getItem(nextKey);
      if (item?.type === "item" && !this.isDisabled(item)) return nextKey;
      nextKey = getNext(nextKey);
    }
    return null;
  }
  getNextKey(key) {
    let nextKey = key;
    return nextKey = this.collection.getKeyAfter(nextKey), this.findNextNonDisabled(nextKey, (key2) => this.collection.getKeyAfter(key2));
  }
  getPreviousKey(key) {
    let nextKey = key;
    return nextKey = this.collection.getKeyBefore(nextKey), this.findNextNonDisabled(nextKey, (key2) => this.collection.getKeyBefore(key2));
  }
  findKey(key, nextKey, shouldSkip) {
    let tempKey = key, itemRect = this.layoutDelegate.getItemRect(tempKey);
    if (!itemRect || tempKey == null) return null;
    let prevRect = itemRect;
    do {
      if (tempKey = nextKey(tempKey), tempKey == null) break;
      itemRect = this.layoutDelegate.getItemRect(tempKey);
    } while (itemRect && shouldSkip(prevRect, itemRect) && tempKey != null);
    return tempKey;
  }
  isSameRow(prevRect, itemRect) {
    return prevRect.y === itemRect.y || prevRect.x !== itemRect.x;
  }
  isSameColumn(prevRect, itemRect) {
    return prevRect.x === itemRect.x || prevRect.y !== itemRect.y;
  }
  getKeyBelow(key) {
    return this.layout === "grid" && this.orientation === "vertical" ? this.findKey(key, (key2) => this.getNextKey(key2), this.isSameRow) : this.getNextKey(key);
  }
  getKeyAbove(key) {
    return this.layout === "grid" && this.orientation === "vertical" ? this.findKey(key, (key2) => this.getPreviousKey(key2), this.isSameRow) : this.getPreviousKey(key);
  }
  getNextColumn(key, right) {
    return right ? this.getPreviousKey(key) : this.getNextKey(key);
  }
  getKeyRightOf(key) {
    let layoutDelegateMethod = this.direction === "ltr" ? "getKeyRightOf" : "getKeyLeftOf";
    return this.layoutDelegate[layoutDelegateMethod] ? (key = this.layoutDelegate[layoutDelegateMethod](key), this.findNextNonDisabled(key, (key2) => this.layoutDelegate[layoutDelegateMethod](key2))) : this.layout === "grid" ? this.orientation === "vertical" ? this.getNextColumn(key, this.direction === "rtl") : this.findKey(key, (key2) => this.getNextColumn(key2, this.direction === "rtl"), this.isSameColumn) : this.orientation === "horizontal" ? this.getNextColumn(key, this.direction === "rtl") : null;
  }
  getKeyLeftOf(key) {
    let layoutDelegateMethod = this.direction === "ltr" ? "getKeyLeftOf" : "getKeyRightOf";
    return this.layoutDelegate[layoutDelegateMethod] ? (key = this.layoutDelegate[layoutDelegateMethod](key), this.findNextNonDisabled(key, (key2) => this.layoutDelegate[layoutDelegateMethod](key2))) : this.layout === "grid" ? this.orientation === "vertical" ? this.getNextColumn(key, this.direction === "ltr") : this.findKey(key, (key2) => this.getNextColumn(key2, this.direction === "ltr"), this.isSameColumn) : this.orientation === "horizontal" ? this.getNextColumn(key, this.direction === "ltr") : null;
  }
  getFirstKey() {
    let key = this.collection.getFirstKey();
    return this.findNextNonDisabled(key, (key2) => this.collection.getKeyAfter(key2));
  }
  getLastKey() {
    let key = this.collection.getLastKey();
    return this.findNextNonDisabled(key, (key2) => this.collection.getKeyBefore(key2));
  }
  getKeyPageAbove(key) {
    let menu = this.ref.current, itemRect = this.layoutDelegate.getItemRect(key);
    if (!itemRect) return null;
    if (menu && !$cc38e7bd3fc7b213$export$2bb74740c4e19def(menu)) return this.getFirstKey();
    let nextKey = key;
    if (this.orientation === "horizontal") {
      let pageX = Math.max(0, itemRect.x + itemRect.width - this.layoutDelegate.getVisibleRect().width);
      for (; itemRect && itemRect.x > pageX && nextKey != null; )
        nextKey = this.getKeyAbove(nextKey), itemRect = nextKey == null ? null : this.layoutDelegate.getItemRect(nextKey);
    } else {
      let pageY = Math.max(0, itemRect.y + itemRect.height - this.layoutDelegate.getVisibleRect().height);
      for (; itemRect && itemRect.y > pageY && nextKey != null; )
        nextKey = this.getKeyAbove(nextKey), itemRect = nextKey == null ? null : this.layoutDelegate.getItemRect(nextKey);
    }
    return nextKey ?? this.getFirstKey();
  }
  getKeyPageBelow(key) {
    let menu = this.ref.current, itemRect = this.layoutDelegate.getItemRect(key);
    if (!itemRect) return null;
    if (menu && !$cc38e7bd3fc7b213$export$2bb74740c4e19def(menu)) return this.getLastKey();
    let nextKey = key;
    if (this.orientation === "horizontal") {
      let pageX = Math.min(this.layoutDelegate.getContentSize().width, itemRect.y - itemRect.width + this.layoutDelegate.getVisibleRect().width);
      for (; itemRect && itemRect.x < pageX && nextKey != null; )
        nextKey = this.getKeyBelow(nextKey), itemRect = nextKey == null ? null : this.layoutDelegate.getItemRect(nextKey);
    } else {
      let pageY = Math.min(this.layoutDelegate.getContentSize().height, itemRect.y - itemRect.height + this.layoutDelegate.getVisibleRect().height);
      for (; itemRect && itemRect.y < pageY && nextKey != null; )
        nextKey = this.getKeyBelow(nextKey), itemRect = nextKey == null ? null : this.layoutDelegate.getItemRect(nextKey);
    }
    return nextKey ?? this.getLastKey();
  }
  getKeyForSearch(search, fromKey) {
    if (!this.collator) return null;
    let collection = this.collection, key = fromKey || this.getFirstKey();
    for (; key != null; ) {
      let item = collection.getItem(key);
      if (!item) return null;
      let substring = item.textValue.slice(0, search.length);
      if (item.textValue && this.collator.compare(substring, search) === 0) return key;
      key = this.getNextKey(key);
    }
    return null;
  }
  constructor(...args) {
    if (args.length === 1) {
      let opts = args[0];
      this.collection = opts.collection, this.ref = opts.ref, this.collator = opts.collator, this.disabledKeys = opts.disabledKeys || /* @__PURE__ */ new Set(), this.disabledBehavior = opts.disabledBehavior || "all", this.orientation = opts.orientation || "vertical", this.direction = opts.direction, this.layout = opts.layout || "stack", this.layoutDelegate = opts.layoutDelegate || new $657e4dc4a6e88df0$export$8f5ed9ff9f511381(opts.ref);
    } else
      this.collection = args[0], this.disabledKeys = args[1], this.ref = args[2], this.collator = args[3], this.layout = "stack", this.orientation = "vertical", this.disabledBehavior = "all", this.layoutDelegate = new $657e4dc4a6e88df0$export$8f5ed9ff9f511381(this.ref);
    this.layout === "stack" && this.orientation === "vertical" && (this.getKeyLeftOf = void 0, this.getKeyRightOf = void 0);
  }
};

// ../node_modules/@react-aria/selection/dist/useSelectableList.mjs
import { useMemo as $1aJk5$useMemo } from "react";
function $982254629710d113$export$b95089534ab7c1fd(props) {
  let { selectionManager, collection, disabledKeys, ref, keyboardDelegate, layoutDelegate } = props, collator = $325a3faab7a68acd$export$a16aca283550c30d({
    usage: "search",
    sensitivity: "base"
  }), disabledBehavior = selectionManager.disabledBehavior, delegate = $1aJk5$useMemo(() => keyboardDelegate || new $2a25aae57d74318e$export$a05409b8bb224a5a({
    collection,
    disabledKeys,
    disabledBehavior,
    ref,
    collator,
    layoutDelegate
  }), [
    keyboardDelegate,
    layoutDelegate,
    collection,
    disabledKeys,
    ref,
    collator,
    disabledBehavior
  ]), { collectionProps } = $ae20dd8cbca75726$export$d6daf82dcd84e87c({
    ...props,
    ref,
    selectionManager,
    keyboardDelegate: delegate
  });
  return {
    listProps: collectionProps
  };
}

// ../node_modules/@react-aria/menu/dist/useMenu.mjs
function $d5336fe17ce95402$export$38eaa17faae8f579(props, state, ref) {
  let { shouldFocusWrap = !0, onKeyDown, onKeyUp, ...otherProps } = props;
  !props["aria-label"] && !props["aria-labelledby"] && process.env.NODE_ENV !== "production" && console.warn("An aria-label or aria-labelledby prop is required for accessibility.");
  let domProps = $65484d02dcb7eb3e$export$457c3d6518dd4c6f(props, {
    labelable: !0
  }), { listProps } = $982254629710d113$export$b95089534ab7c1fd({
    ...otherProps,
    ref,
    selectionManager: state.selectionManager,
    collection: state.collection,
    disabledKeys: state.disabledKeys,
    shouldFocusWrap,
    linkBehavior: "override"
  });
  return $fc79756100351201$export$6f49b4016bfc8d56.set(state, {
    onClose: props.onClose,
    onAction: props.onAction,
    shouldUseVirtualFocus: props.shouldUseVirtualFocus
  }), {
    menuProps: $3ef42575df84b30b$export$9d1611c77c2fe928(domProps, {
      onKeyDown,
      onKeyUp
    }, {
      role: "menu",
      ...listProps,
      onKeyDown: (e) => {
        var _listProps_onKeyDown;
        (e.key !== "Escape" || props.shouldUseVirtualFocus) && ((_listProps_onKeyDown = listProps.onKeyDown) === null || _listProps_onKeyDown === void 0 || _listProps_onKeyDown.call(listProps, e));
      }
    })
  };
}

// ../node_modules/@react-stately/collections/dist/Item.mjs
import $6Fm0V$react from "react";
function $c1d7fb2ec91bae71$var$Item(props) {
  return null;
}
$c1d7fb2ec91bae71$var$Item.getCollectionNode = function* (props, context) {
  let { childItems, title, children } = props, rendered = props.title || props.children, textValue = props.textValue || (typeof rendered == "string" ? rendered : "") || props["aria-label"] || "";
  !textValue && !context?.suppressTextValueWarning && process.env.NODE_ENV !== "production" && console.warn("<Item> with non-plain text contents is unsupported by type to select for accessibility. Please add a `textValue` prop."), yield {
    type: "item",
    props,
    rendered,
    textValue,
    "aria-label": props["aria-label"],
    hasChildNodes: $c1d7fb2ec91bae71$var$hasChildItems(props),
    *childNodes() {
      if (childItems) for (let child of childItems) yield {
        type: "item",
        value: child
      };
      else if (title) {
        let items = [];
        $6Fm0V$react.Children.forEach(children, (child) => {
          items.push({
            type: "item",
            element: child
          });
        }), yield* items;
      }
    }
  };
};
function $c1d7fb2ec91bae71$var$hasChildItems(props) {
  return props.hasChildItems != null ? props.hasChildItems : !!(props.childItems || props.title && $6Fm0V$react.Children.count(props.children) > 0);
}
var $c1d7fb2ec91bae71$export$6d08773d2e66f8f2 = $c1d7fb2ec91bae71$var$Item;

// ../node_modules/@react-stately/collections/dist/Section.mjs
import $gtysd$react from "react";
function $9fc4852771d079eb$var$Section(props) {
  return null;
}
$9fc4852771d079eb$var$Section.getCollectionNode = function* (props) {
  let { children, title, items } = props;
  yield {
    type: "section",
    props,
    hasChildNodes: !0,
    rendered: title,
    "aria-label": props["aria-label"],
    *childNodes() {
      if (typeof children == "function") {
        if (!items) throw new Error("props.children was a function but props.items is missing");
        for (let item of items) yield {
          type: "item",
          value: item,
          renderer: children
        };
      } else {
        let items2 = [];
        $gtysd$react.Children.forEach(children, (child) => {
          items2.push({
            type: "item",
            element: child
          });
        }), yield* items2;
      }
    }
  };
};

// ../node_modules/@react-stately/collections/dist/CollectionBuilder.mjs
import $fzaAv$react from "react";
var $eb2240fc39a57fa5$export$bf788dd355e3a401 = class {
  build(props, context) {
    return this.context = context, $eb2240fc39a57fa5$var$iterable(() => this.iterateCollection(props));
  }
  *iterateCollection(props) {
    let { children, items } = props;
    if ($fzaAv$react.isValidElement(children) && children.type === $fzaAv$react.Fragment) yield* this.iterateCollection({
      children: children.props.children,
      items
    });
    else if (typeof children == "function") {
      if (!items) throw new Error("props.children was a function but props.items is missing");
      let index3 = 0;
      for (let item of items)
        yield* this.getFullNode({
          value: item,
          index: index3
        }, {
          renderer: children
        }), index3++;
    } else {
      let items2 = [];
      $fzaAv$react.Children.forEach(children, (child) => {
        child && items2.push(child);
      });
      let index3 = 0;
      for (let item of items2) {
        let nodes = this.getFullNode({
          element: item,
          index: index3
        }, {});
        for (let node of nodes)
          index3++, yield node;
      }
    }
  }
  getKey(item, partialNode, state, parentKey) {
    if (item.key != null) return item.key;
    if (partialNode.type === "cell" && partialNode.key != null) return `${parentKey}${partialNode.key}`;
    let v = partialNode.value;
    if (v != null) {
      var _v_key;
      let key = (_v_key = v.key) !== null && _v_key !== void 0 ? _v_key : v.id;
      if (key == null) throw new Error("No key found for item");
      return key;
    }
    return parentKey ? `${parentKey}.${partialNode.index}` : `$.${partialNode.index}`;
  }
  getChildState(state, partialNode) {
    return {
      renderer: partialNode.renderer || state.renderer
    };
  }
  *getFullNode(partialNode, state, parentKey, parentNode) {
    if ($fzaAv$react.isValidElement(partialNode.element) && partialNode.element.type === $fzaAv$react.Fragment) {
      let children = [];
      $fzaAv$react.Children.forEach(partialNode.element.props.children, (child) => {
        children.push(child);
      });
      var _partialNode_index;
      let index3 = (_partialNode_index = partialNode.index) !== null && _partialNode_index !== void 0 ? _partialNode_index : 0;
      for (let child of children) yield* this.getFullNode({
        element: child,
        index: index3++
      }, state, parentKey, parentNode);
      return;
    }
    let element = partialNode.element;
    if (!element && partialNode.value && state && state.renderer) {
      let cached = this.cache.get(partialNode.value);
      if (cached && (!cached.shouldInvalidate || !cached.shouldInvalidate(this.context))) {
        cached.index = partialNode.index, cached.parentKey = parentNode ? parentNode.key : null, yield cached;
        return;
      }
      element = state.renderer(partialNode.value);
    }
    if ($fzaAv$react.isValidElement(element)) {
      let type = element.type;
      if (typeof type != "function" && typeof type.getCollectionNode != "function") {
        let name = element.type;
        throw new Error(`Unknown element <${name}> in collection.`);
      }
      let childNodes = type.getCollectionNode(element.props, this.context);
      var _partialNode_index1;
      let index3 = (_partialNode_index1 = partialNode.index) !== null && _partialNode_index1 !== void 0 ? _partialNode_index1 : 0, result = childNodes.next();
      for (; !result.done && result.value; ) {
        let childNode = result.value;
        partialNode.index = index3;
        var _childNode_key;
        let nodeKey = (_childNode_key = childNode.key) !== null && _childNode_key !== void 0 ? _childNode_key : null;
        nodeKey == null && (nodeKey = childNode.element ? null : this.getKey(element, partialNode, state, parentKey));
        let children = [
          ...this.getFullNode({
            ...childNode,
            key: nodeKey,
            index: index3,
            wrapper: $eb2240fc39a57fa5$var$compose(partialNode.wrapper, childNode.wrapper)
          }, this.getChildState(state, childNode), parentKey ? `${parentKey}${element.key}` : element.key, parentNode)
        ];
        for (let node2 of children) {
          var _childNode_value, _ref;
          node2.value = (_ref = (_childNode_value = childNode.value) !== null && _childNode_value !== void 0 ? _childNode_value : partialNode.value) !== null && _ref !== void 0 ? _ref : null, node2.value && this.cache.set(node2.value, node2);
          var _parentNode_type;
          if (partialNode.type && node2.type !== partialNode.type) throw new Error(`Unsupported type <${$eb2240fc39a57fa5$var$capitalize(node2.type)}> in <${$eb2240fc39a57fa5$var$capitalize((_parentNode_type = parentNode?.type) !== null && _parentNode_type !== void 0 ? _parentNode_type : "unknown parent type")}>. Only <${$eb2240fc39a57fa5$var$capitalize(partialNode.type)}> is supported.`);
          index3++, yield node2;
        }
        result = childNodes.next(children);
      }
      return;
    }
    if (partialNode.key == null || partialNode.type == null) return;
    let builder = this;
    var _partialNode_value, _partialNode_textValue;
    let node = {
      type: partialNode.type,
      props: partialNode.props,
      key: partialNode.key,
      parentKey: parentNode ? parentNode.key : null,
      value: (_partialNode_value = partialNode.value) !== null && _partialNode_value !== void 0 ? _partialNode_value : null,
      level: parentNode ? parentNode.level + 1 : 0,
      index: partialNode.index,
      rendered: partialNode.rendered,
      textValue: (_partialNode_textValue = partialNode.textValue) !== null && _partialNode_textValue !== void 0 ? _partialNode_textValue : "",
      "aria-label": partialNode["aria-label"],
      wrapper: partialNode.wrapper,
      shouldInvalidate: partialNode.shouldInvalidate,
      hasChildNodes: partialNode.hasChildNodes || !1,
      childNodes: $eb2240fc39a57fa5$var$iterable(function* () {
        if (!partialNode.hasChildNodes || !partialNode.childNodes) return;
        let index3 = 0;
        for (let child of partialNode.childNodes()) {
          child.key != null && (child.key = `${node.key}${child.key}`);
          let nodes = builder.getFullNode({
            ...child,
            index: index3
          }, builder.getChildState(state, child), node.key, node);
          for (let node2 of nodes)
            index3++, yield node2;
        }
      })
    };
    yield node;
  }
  constructor() {
    this.cache = /* @__PURE__ */ new WeakMap();
  }
};
function $eb2240fc39a57fa5$var$iterable(iterator) {
  let cache = [], iterable = null;
  return {
    *[Symbol.iterator]() {
      for (let item of cache) yield item;
      iterable || (iterable = iterator());
      for (let item of iterable)
        cache.push(item), yield item;
    }
  };
}
function $eb2240fc39a57fa5$var$compose(outer, inner) {
  if (outer && inner) return (element) => outer(inner(element));
  if (outer) return outer;
  if (inner) return inner;
}
function $eb2240fc39a57fa5$var$capitalize(str) {
  return str[0].toUpperCase() + str.slice(1);
}

// ../node_modules/@react-stately/collections/dist/useCollection.mjs
import { useMemo as $lbNth$useMemo } from "react";
function $7613b1592d41b092$export$6cd28814d92fa9c9(props, factory, context) {
  let builder = $lbNth$useMemo(() => new $eb2240fc39a57fa5$export$bf788dd355e3a401(), []), { children, items, collection } = props;
  return $lbNth$useMemo(() => {
    if (collection) return collection;
    let nodes = builder.build({
      children,
      items
    }, context);
    return factory(nodes);
  }, [
    builder,
    children,
    items,
    collection,
    context,
    factory
  ]);
}

// ../node_modules/@react-stately/collections/dist/getChildNodes.mjs
function $c5a24bc478652b5f$export$1005530eda016c13(node, collection) {
  return typeof collection.getChildren == "function" ? collection.getChildren(node.key) : node.childNodes;
}
function $c5a24bc478652b5f$export$fbdeaa6a76694f71(iterable) {
  return $c5a24bc478652b5f$export$5f3398f8733f90e2(iterable, 0);
}
function $c5a24bc478652b5f$export$5f3398f8733f90e2(iterable, index3) {
  if (index3 < 0) return;
  let i = 0;
  for (let item of iterable) {
    if (i === index3) return item;
    i++;
  }
}
function $c5a24bc478652b5f$export$8c434b3a7a4dad6(collection, a, b) {
  if (a.parentKey === b.parentKey) return a.index - b.index;
  let aAncestors = [
    ...$c5a24bc478652b5f$var$getAncestors(collection, a),
    a
  ], bAncestors = [
    ...$c5a24bc478652b5f$var$getAncestors(collection, b),
    b
  ], firstNonMatchingAncestor = aAncestors.slice(0, bAncestors.length).findIndex((a2, i) => a2 !== bAncestors[i]);
  return firstNonMatchingAncestor !== -1 ? (a = aAncestors[firstNonMatchingAncestor], b = bAncestors[firstNonMatchingAncestor], a.index - b.index) : aAncestors.findIndex((node) => node === b) >= 0 ? 1 : (bAncestors.findIndex((node) => node === a) >= 0, -1);
}
function $c5a24bc478652b5f$var$getAncestors(collection, node) {
  let parents = [], currNode = node;
  for (; currNode?.parentKey != null; )
    currNode = collection.getItem(currNode.parentKey), currNode && parents.unshift(currNode);
  return parents;
}

// ../node_modules/@react-stately/collections/dist/getItemCount.mjs
var $453cc9f0df89c0a5$var$cache = /* @__PURE__ */ new WeakMap();
function $453cc9f0df89c0a5$export$77d5aafae4e095b2(collection) {
  let count = $453cc9f0df89c0a5$var$cache.get(collection);
  if (count != null) return count;
  let counter = 0, countItems = (items) => {
    for (let item of items)
      item.type === "section" ? countItems($c5a24bc478652b5f$export$1005530eda016c13(item, collection)) : item.type === "item" && counter++;
  };
  return countItems(collection), $453cc9f0df89c0a5$var$cache.set(collection, counter), counter;
}

// ../node_modules/@react-aria/menu/dist/useMenuItem.mjs
import { useRef as $7Kjv5$useRef } from "react";
function $a2e5df62f93c7633$export$9d32628fc2aea7da(props, state, ref) {
  let { id, key, closeOnSelect, isVirtualized, "aria-haspopup": hasPopup, onPressStart, onPressUp: pressUpProp, onPress, onPressChange: pressChangeProp, onPressEnd, onClick: onClickProp, onHoverStart: hoverStartProp, onHoverChange, onHoverEnd, onKeyDown, onKeyUp, onFocus, onFocusChange, onBlur, selectionManager = state.selectionManager } = props, isTrigger = !!hasPopup, isTriggerExpanded = isTrigger && props["aria-expanded"] === "true";
  var _props_isDisabled;
  let isDisabled = (_props_isDisabled = props.isDisabled) !== null && _props_isDisabled !== void 0 ? _props_isDisabled : selectionManager.isDisabled(key);
  var _props_isSelected;
  let isSelected = (_props_isSelected = props.isSelected) !== null && _props_isSelected !== void 0 ? _props_isSelected : selectionManager.isSelected(key), data = $fc79756100351201$export$6f49b4016bfc8d56.get(state), item = state.collection.getItem(key), onClose = props.onClose || data.onClose, router = $ea8dcbcb9ea1b556$export$9a302a45f65d0572(), performAction = () => {
    var _item_props;
    if (!isTrigger && (!(item == null || (_item_props = item.props) === null || _item_props === void 0) && _item_props.onAction ? item.props.onAction() : props.onAction && props.onAction(key), data.onAction)) {
      let onAction = data.onAction;
      onAction(key);
    }
  }, role = "menuitem";
  isTrigger || (selectionManager.selectionMode === "single" ? role = "menuitemradio" : selectionManager.selectionMode === "multiple" && (role = "menuitemcheckbox"));
  let labelId = $bdb11010cef70236$export$b4cc09c592e8fdb8(), descriptionId = $bdb11010cef70236$export$b4cc09c592e8fdb8(), keyboardId = $bdb11010cef70236$export$b4cc09c592e8fdb8(), ariaProps = {
    id,
    "aria-disabled": isDisabled || void 0,
    role,
    "aria-label": props["aria-label"],
    "aria-labelledby": labelId,
    "aria-describedby": [
      descriptionId,
      keyboardId
    ].filter(Boolean).join(" ") || void 0,
    "aria-controls": props["aria-controls"],
    "aria-haspopup": hasPopup,
    "aria-expanded": props["aria-expanded"]
  };
  selectionManager.selectionMode !== "none" && !isTrigger && (ariaProps["aria-checked"] = isSelected), isVirtualized && (ariaProps["aria-posinset"] = item?.index, ariaProps["aria-setsize"] = $453cc9f0df89c0a5$export$77d5aafae4e095b2(state.collection));
  let isPressedRef = $7Kjv5$useRef(!1), onPressChange = (isPressed2) => {
    pressChangeProp?.(isPressed2), isPressedRef.current = isPressed2;
  }, interaction = $7Kjv5$useRef(null), onPressUp = (e) => {
    e.pointerType !== "keyboard" && (interaction.current = {
      pointerType: e.pointerType
    }), e.pointerType === "mouse" && (isPressedRef.current || e.target.click()), pressUpProp?.(e);
  }, onClick = (e) => {
    var _interaction_current, _interaction_current1;
    onClickProp?.(e), performAction(), $ea8dcbcb9ea1b556$export$13aea1a3cb5e3f1f(e, router, item.props.href, item?.props.routerOptions);
    let shouldClose = ((_interaction_current = interaction.current) === null || _interaction_current === void 0 ? void 0 : _interaction_current.pointerType) === "keyboard" ? ((_interaction_current1 = interaction.current) === null || _interaction_current1 === void 0 ? void 0 : _interaction_current1.key) === "Enter" || selectionManager.selectionMode === "none" || selectionManager.isLink(key) : selectionManager.selectionMode !== "multiple" || selectionManager.isLink(key);
    shouldClose = closeOnSelect ?? shouldClose, onClose && !isTrigger && shouldClose && onClose(), interaction.current = null;
  }, { itemProps, isFocused } = $880e95eb8b93ba9a$export$ecf600387e221c37({
    id,
    selectionManager,
    key,
    ref,
    shouldSelectOnPressUp: !0,
    allowsDifferentPressOrigin: !0,
    // Disable all handling of links in useSelectable item
    // because we handle it ourselves. The behavior of menus
    // is slightly different from other collections because
    // actions are performed on key down rather than key up.
    linkBehavior: "none",
    shouldUseVirtualFocus: data.shouldUseVirtualFocus
  }), { pressProps, isPressed } = $f6c31cce2adf654f$export$45712eceda6fad21({
    onPressStart,
    onPress,
    onPressUp,
    onPressChange,
    onPressEnd,
    isDisabled
  }), { hoverProps } = $6179b936705e76d3$export$ae780daf29e6d456({
    isDisabled,
    onHoverStart(e) {
      !$507fabe10e71c6fb$export$b9b3dfddab17db27() && !(isTriggerExpanded && hasPopup) && (selectionManager.setFocused(!0), selectionManager.setFocusedKey(key)), hoverStartProp?.(e);
    },
    onHoverChange,
    onHoverEnd
  }), { keyboardProps } = $46d819fcbaf35654$export$8f71654801c2f7cd({
    onKeyDown: (e) => {
      if (e.repeat) {
        e.continuePropagation();
        return;
      }
      switch (e.key) {
        case " ":
          interaction.current = {
            pointerType: "keyboard",
            key: " "
          }, e.target.click();
          break;
        case "Enter":
          interaction.current = {
            pointerType: "keyboard",
            key: "Enter"
          }, e.target.tagName !== "A" && e.target.click();
          break;
        default:
          isTrigger || e.continuePropagation(), onKeyDown?.(e);
          break;
      }
    },
    onKeyUp
  }), { focusProps } = $a1ea59d68270f0dd$export$f8168d8dd8fd66e6({
    onBlur,
    onFocus,
    onFocusChange
  }), domProps = $65484d02dcb7eb3e$export$457c3d6518dd4c6f(item?.props);
  delete domProps.id;
  let linkProps = $ea8dcbcb9ea1b556$export$7e924b3091a3bd18(item?.props);
  return {
    menuItemProps: {
      ...ariaProps,
      ...$3ef42575df84b30b$export$9d1611c77c2fe928(
        domProps,
        linkProps,
        isTrigger ? {
          onFocus: itemProps.onFocus,
          "data-collection": itemProps["data-collection"],
          "data-key": itemProps["data-key"]
        } : itemProps,
        pressProps,
        hoverProps,
        keyboardProps,
        focusProps,
        // Prevent DOM focus from moving on mouse down when using virtual focus or this is a submenu/subdialog trigger.
        data.shouldUseVirtualFocus || isTrigger ? {
          onMouseDown: (e) => e.preventDefault()
        } : void 0,
        isDisabled ? void 0 : {
          onClick
        }
      ),
      // If a submenu is expanded, set the tabIndex to -1 so that shift tabbing goes out of the menu instead of the parent menu item.
      tabIndex: itemProps.tabIndex != null && isTriggerExpanded && !data.shouldUseVirtualFocus ? -1 : itemProps.tabIndex
    },
    labelProps: {
      id: labelId
    },
    descriptionProps: {
      id: descriptionId
    },
    keyboardShortcutProps: {
      id: keyboardId
    },
    isFocused,
    isFocusVisible: isFocused && selectionManager.isFocused && $507fabe10e71c6fb$export$b9b3dfddab17db27() && !isTriggerExpanded,
    isSelected,
    isPressed,
    isDisabled
  };
}

// ../node_modules/@react-aria/menu/dist/useMenuSection.mjs
function $3e5eb2498db5b506$export$73f7a44322579622(props) {
  let { heading, "aria-label": ariaLabel } = props, headingId = $bdb11010cef70236$export$f680877a34711e37();
  return {
    itemProps: {
      role: "presentation"
    },
    headingProps: heading ? {
      // Techincally, menus cannot contain headings according to ARIA.
      // We hide the heading from assistive technology, using role="presentation",
      // and only use it as a label for the nested group.
      id: headingId,
      role: "presentation"
    } : {},
    groupProps: {
      role: "group",
      "aria-label": ariaLabel,
      "aria-labelledby": heading ? headingId : void 0
    }
  };
}

// ../node_modules/@react-aria/menu/dist/useSafelyMouseToSubmenu.mjs
import { useRef as $fUfeP$useRef, useState as $fUfeP$useState, useEffect as $fUfeP$useEffect } from "react";
var $d275435c250248f8$var$ALLOWED_INVALID_MOVEMENTS = 2, $d275435c250248f8$var$THROTTLE_TIME = 50, $d275435c250248f8$var$TIMEOUT_TIME = 1e3, $d275435c250248f8$var$ANGLE_PADDING = Math.PI / 12;
function $d275435c250248f8$export$85ec83e04c95f50a(options) {
  let { menuRef, submenuRef, isOpen, isDisabled } = options, prevPointerPos = $fUfeP$useRef(void 0), submenuRect = $fUfeP$useRef(void 0), lastProcessedTime = $fUfeP$useRef(0), timeout = $fUfeP$useRef(void 0), autoCloseTimeout = $fUfeP$useRef(void 0), submenuSide = $fUfeP$useRef(void 0), movementsTowardsSubmenuCount = $fUfeP$useRef(2), [preventPointerEvents, setPreventPointerEvents] = $fUfeP$useState(!1);
  $9daab02d461809db$export$683480f191c0e3ea({
    ref: submenuRef,
    onResize: () => {
      submenuRef.current && (submenuRect.current = submenuRef.current.getBoundingClientRect(), submenuSide.current = void 0);
    }
  });
  let reset = () => {
    setPreventPointerEvents(!1), movementsTowardsSubmenuCount.current = $d275435c250248f8$var$ALLOWED_INVALID_MOVEMENTS, prevPointerPos.current = void 0;
  }, modality = $507fabe10e71c6fb$export$98e20ec92f614cfe(), onPointerDown = $8ae05eaa5c114e9c$export$7f54fc3180508a52((e) => {
    preventPointerEvents && e.preventDefault();
  });
  $fUfeP$useEffect(() => {
    preventPointerEvents && menuRef.current ? menuRef.current.style.pointerEvents = "none" : menuRef.current.style.pointerEvents = "";
  }, [
    menuRef,
    preventPointerEvents
  ]), $fUfeP$useEffect(() => {
    let submenu = submenuRef.current, menu = menuRef.current;
    if (isDisabled || !submenu || !isOpen || modality !== "pointer" || !menu) {
      reset();
      return;
    }
    submenuRect.current = submenu.getBoundingClientRect();
    let onPointerMove = (e) => {
      if (e.pointerType === "touch" || e.pointerType === "pen") return;
      let currentTime = Date.now();
      if (currentTime - lastProcessedTime.current < $d275435c250248f8$var$THROTTLE_TIME) return;
      clearTimeout(timeout.current), clearTimeout(autoCloseTimeout.current);
      let { clientX: mouseX, clientY: mouseY } = e;
      if (!prevPointerPos.current) {
        prevPointerPos.current = {
          x: mouseX,
          y: mouseY
        };
        return;
      }
      if (!submenuRect.current) return;
      if (submenuSide.current || (submenuSide.current = mouseX > submenuRect.current.right ? "left" : "right"), mouseX < menu.getBoundingClientRect().left || mouseX > menu.getBoundingClientRect().right || mouseY < menu.getBoundingClientRect().top || mouseY > menu.getBoundingClientRect().bottom) {
        reset();
        return;
      }
      let prevMouseX = prevPointerPos.current.x, prevMouseY = prevPointerPos.current.y, toSubmenuX = submenuSide.current === "right" ? submenuRect.current.left - prevMouseX : prevMouseX - submenuRect.current.right, angleTop = Math.atan2(prevMouseY - submenuRect.current.top, toSubmenuX) + $d275435c250248f8$var$ANGLE_PADDING, angleBottom = Math.atan2(prevMouseY - submenuRect.current.bottom, toSubmenuX) - $d275435c250248f8$var$ANGLE_PADDING, anglePointer = Math.atan2(prevMouseY - mouseY, submenuSide.current === "left" ? -(mouseX - prevMouseX) : mouseX - prevMouseX), isMovingTowardsSubmenu = anglePointer < angleTop && anglePointer > angleBottom;
      movementsTowardsSubmenuCount.current = isMovingTowardsSubmenu ? Math.min(movementsTowardsSubmenuCount.current + 1, $d275435c250248f8$var$ALLOWED_INVALID_MOVEMENTS) : Math.max(movementsTowardsSubmenuCount.current - 1, 0), movementsTowardsSubmenuCount.current >= $d275435c250248f8$var$ALLOWED_INVALID_MOVEMENTS ? setPreventPointerEvents(!0) : setPreventPointerEvents(!1), lastProcessedTime.current = currentTime, prevPointerPos.current = {
        x: mouseX,
        y: mouseY
      }, isMovingTowardsSubmenu && (timeout.current = setTimeout(() => {
        reset(), autoCloseTimeout.current = setTimeout(() => {
          let target = document.elementFromPoint(mouseX, mouseY);
          target && menu.contains(target) && target.dispatchEvent(new PointerEvent("pointerover", {
            bubbles: !0,
            cancelable: !0
          }));
        }, 100);
      }, $d275435c250248f8$var$TIMEOUT_TIME));
    };
    return window.addEventListener("pointermove", onPointerMove), process.env.NODE_ENV !== "test" && window.addEventListener("pointerdown", onPointerDown, !0), () => {
      window.removeEventListener("pointermove", onPointerMove), process.env.NODE_ENV !== "test" && window.removeEventListener("pointerdown", onPointerDown, !0), clearTimeout(timeout.current), clearTimeout(autoCloseTimeout.current), movementsTowardsSubmenuCount.current = $d275435c250248f8$var$ALLOWED_INVALID_MOVEMENTS;
    };
  }, [
    isDisabled,
    isOpen,
    menuRef,
    modality,
    setPreventPointerEvents,
    onPointerDown,
    submenuRef
  ]);
}

// ../node_modules/@react-aria/menu/dist/useSubmenuTrigger.mjs
import { useRef as $dXlYe$useRef, useCallback as $dXlYe$useCallback } from "react";
function $0065b146e7192841$export$7138b0d059a6e743(props, state, ref) {
  let { parentMenuRef, submenuRef, type = "menu", isDisabled, delay = 200, shouldUseVirtualFocus } = props, submenuTriggerId = $bdb11010cef70236$export$f680877a34711e37(), overlayId = $bdb11010cef70236$export$f680877a34711e37(), { direction } = $18f2051aff69b9bf$export$43bb16f9c6d9e3f7(), openTimeout = $dXlYe$useRef(void 0), cancelOpenTimeout = $dXlYe$useCallback(() => {
    openTimeout.current && (clearTimeout(openTimeout.current), openTimeout.current = void 0);
  }, [
    openTimeout
  ]), onSubmenuOpen = $8ae05eaa5c114e9c$export$7f54fc3180508a52((focusStrategy) => {
    cancelOpenTimeout(), state.open(focusStrategy);
  }), onSubmenuClose = $8ae05eaa5c114e9c$export$7f54fc3180508a52(() => {
    cancelOpenTimeout(), state.close();
  });
  $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => () => {
    cancelOpenTimeout();
  }, [
    cancelOpenTimeout
  ]);
  let submenuKeyDown = (e) => {
    if (e.currentTarget.contains(document.activeElement))
      switch (e.key) {
        case "ArrowLeft":
          direction === "ltr" && e.currentTarget.contains(e.target) && (e.preventDefault(), e.stopPropagation(), onSubmenuClose(), !shouldUseVirtualFocus && ref.current && $7215afc6de606d6b$export$de79e2c695e052f3(ref.current));
          break;
        case "ArrowRight":
          direction === "rtl" && e.currentTarget.contains(e.target) && (e.preventDefault(), e.stopPropagation(), onSubmenuClose(), !shouldUseVirtualFocus && ref.current && $7215afc6de606d6b$export$de79e2c695e052f3(ref.current));
          break;
        case "Escape":
          var _submenuRef_current;
          !((_submenuRef_current = submenuRef.current) === null || _submenuRef_current === void 0) && _submenuRef_current.contains(e.target) && (e.stopPropagation(), onSubmenuClose(), !shouldUseVirtualFocus && ref.current && $7215afc6de606d6b$export$de79e2c695e052f3(ref.current));
          break;
      }
  };
  var _state_focusStrategy;
  let submenuProps = {
    id: overlayId,
    "aria-labelledby": submenuTriggerId,
    submenuLevel: state.submenuLevel,
    ...type === "menu" && {
      onClose: state.closeAll,
      autoFocus: (_state_focusStrategy = state.focusStrategy) !== null && _state_focusStrategy !== void 0 ? _state_focusStrategy : void 0,
      onKeyDown: submenuKeyDown
    }
  }, submenuTriggerKeyDown = (e) => {
    switch (e.key) {
      case "ArrowRight":
        isDisabled || (direction === "ltr" ? (e.preventDefault(), state.isOpen || onSubmenuOpen("first"), type === "menu" && submenuRef?.current && document.activeElement === ref?.current && $7215afc6de606d6b$export$de79e2c695e052f3(submenuRef.current)) : state.isOpen ? onSubmenuClose() : e.continuePropagation());
        break;
      case "ArrowLeft":
        isDisabled || (direction === "rtl" ? (e.preventDefault(), state.isOpen || onSubmenuOpen("first"), type === "menu" && submenuRef?.current && document.activeElement === ref?.current && $7215afc6de606d6b$export$de79e2c695e052f3(submenuRef.current)) : state.isOpen ? onSubmenuClose() : e.continuePropagation());
        break;
      default:
        e.continuePropagation();
        break;
    }
  }, onPressStart = (e) => {
    !isDisabled && (e.pointerType === "virtual" || e.pointerType === "keyboard") && onSubmenuOpen("first");
  }, onPress = (e) => {
    !isDisabled && (e.pointerType === "touch" || e.pointerType === "mouse") && onSubmenuOpen();
  }, onHoverChange = (isHovered) => {
    isDisabled || (isHovered && !state.isOpen ? openTimeout.current || (openTimeout.current = setTimeout(() => {
      onSubmenuOpen();
    }, delay)) : isHovered || cancelOpenTimeout());
  };
  $e9faafb641e167db$export$90fc3a17d93f704c(parentMenuRef, "focusin", (e) => {
    var _parentMenuRef_current;
    state.isOpen && (!((_parentMenuRef_current = parentMenuRef.current) === null || _parentMenuRef_current === void 0) && _parentMenuRef_current.contains(e.target)) && e.target !== ref.current && onSubmenuClose();
  });
  let shouldCloseOnInteractOutside = (target) => target !== ref.current;
  return $d275435c250248f8$export$85ec83e04c95f50a({
    menuRef: parentMenuRef,
    submenuRef,
    isOpen: state.isOpen,
    isDisabled
  }), {
    submenuTriggerProps: {
      id: submenuTriggerId,
      "aria-controls": state.isOpen ? overlayId : void 0,
      "aria-haspopup": isDisabled ? void 0 : type,
      "aria-expanded": state.isOpen ? "true" : "false",
      onPressStart,
      onPress,
      onHoverChange,
      onKeyDown: submenuTriggerKeyDown,
      isOpen: state.isOpen
    },
    submenuProps,
    popoverProps: {
      isNonModal: !0,
      shouldCloseOnInteractOutside
    }
  };
}

// ../node_modules/@react-stately/menu/dist/useMenuTriggerState.mjs
import { useState as $8bn9m$useState } from "react";
function $a28c903ee9ad8dc5$export$79fefeb1c2091ac3(props) {
  let overlayTriggerState = $fc909762b330b746$export$61c6a8c84e605fb6(props), [focusStrategy, setFocusStrategy] = $8bn9m$useState(null), [expandedKeysStack, setExpandedKeysStack] = $8bn9m$useState([]), closeAll = () => {
    setExpandedKeysStack([]), overlayTriggerState.close();
  };
  return {
    focusStrategy,
    ...overlayTriggerState,
    open(focusStrategy2 = null) {
      setFocusStrategy(focusStrategy2), overlayTriggerState.open();
    },
    toggle(focusStrategy2 = null) {
      setFocusStrategy(focusStrategy2), overlayTriggerState.toggle();
    },
    close() {
      closeAll();
    },
    expandedKeysStack,
    openSubmenu: (triggerKey, level) => {
      setExpandedKeysStack((oldStack) => level > oldStack.length ? oldStack : [
        ...oldStack.slice(0, level),
        triggerKey
      ]);
    },
    closeSubmenu: (triggerKey, level) => {
      setExpandedKeysStack((oldStack) => oldStack[level] === triggerKey ? oldStack.slice(0, level) : oldStack);
    }
  };
}

// ../node_modules/@react-stately/menu/dist/useSubmenuTriggerState.mjs
import { useState as $7exkJ$useState, useMemo as $7exkJ$useMemo, useCallback as $7exkJ$useCallback } from "react";
function $e5614764aa47eb35$export$cfc51cf86138bf98(props, state) {
  let { triggerKey } = props, { expandedKeysStack, openSubmenu, closeSubmenu, close: closeAll } = state, [submenuLevel] = $7exkJ$useState(expandedKeysStack?.length), isOpen = $7exkJ$useMemo(() => expandedKeysStack[submenuLevel] === triggerKey, [
    expandedKeysStack,
    triggerKey,
    submenuLevel
  ]), [focusStrategy, setFocusStrategy] = $7exkJ$useState(null), open = $7exkJ$useCallback((focusStrategy2) => {
    setFocusStrategy(focusStrategy2 ?? null), openSubmenu(triggerKey, submenuLevel);
  }, [
    openSubmenu,
    submenuLevel,
    triggerKey
  ]), close = $7exkJ$useCallback(() => {
    setFocusStrategy(null), closeSubmenu(triggerKey, submenuLevel);
  }, [
    closeSubmenu,
    submenuLevel,
    triggerKey
  ]), toggle = $7exkJ$useCallback((focusStrategy2) => {
    setFocusStrategy(focusStrategy2 ?? null), isOpen ? close() : open(focusStrategy2);
  }, [
    close,
    open,
    isOpen
  ]);
  return $7exkJ$useMemo(() => ({
    focusStrategy,
    isOpen,
    open,
    close,
    closeAll,
    submenuLevel,
    // TODO: Placeholders that aren't used but give us parity with OverlayTriggerState so we can use this in Popover. Refactor if we update Popover via
    // https://github.com/adobe/react-spectrum/pull/4976#discussion_r1336472863
    setOpen: () => {
    },
    toggle
  }), [
    isOpen,
    open,
    close,
    closeAll,
    focusStrategy,
    toggle,
    submenuLevel
  ]);
}

// ../node_modules/@react-stately/tree/dist/TreeCollection.mjs
var $05ca4cd7c4a5a999$export$863faf230ee2118a = class {
  *[Symbol.iterator]() {
    yield* this.iterable;
  }
  get size() {
    return this.keyMap.size;
  }
  getKeys() {
    return this.keyMap.keys();
  }
  getKeyBefore(key) {
    let node = this.keyMap.get(key);
    var _node_prevKey;
    return node && (_node_prevKey = node.prevKey) !== null && _node_prevKey !== void 0 ? _node_prevKey : null;
  }
  getKeyAfter(key) {
    let node = this.keyMap.get(key);
    var _node_nextKey;
    return node && (_node_nextKey = node.nextKey) !== null && _node_nextKey !== void 0 ? _node_nextKey : null;
  }
  getFirstKey() {
    return this.firstKey;
  }
  getLastKey() {
    return this.lastKey;
  }
  getItem(key) {
    var _this_keyMap_get;
    return (_this_keyMap_get = this.keyMap.get(key)) !== null && _this_keyMap_get !== void 0 ? _this_keyMap_get : null;
  }
  at(idx) {
    let keys = [
      ...this.getKeys()
    ];
    return this.getItem(keys[idx]);
  }
  constructor(nodes, { expandedKeys } = {}) {
    this.keyMap = /* @__PURE__ */ new Map(), this.firstKey = null, this.lastKey = null, this.iterable = nodes, expandedKeys = expandedKeys || /* @__PURE__ */ new Set();
    let visit = (node) => {
      if (this.keyMap.set(node.key, node), node.childNodes && (node.type === "section" || expandedKeys.has(node.key))) for (let child of node.childNodes) visit(child);
    };
    for (let node of nodes) visit(node);
    let last = null, index3 = 0;
    for (let [key, node] of this.keyMap)
      last ? (last.nextKey = key, node.prevKey = last.key) : (this.firstKey = key, node.prevKey = void 0), node.type === "item" && (node.index = index3++), last = node, last.nextKey = void 0;
    var _last_key;
    this.lastKey = (_last_key = last?.key) !== null && _last_key !== void 0 ? _last_key : null;
  }
};

// ../node_modules/@react-stately/selection/dist/Selection.mjs
var $e40ea825a81a3709$export$52baac22726c72bf = class _$e40ea825a81a3709$export$52baac22726c72bf extends Set {
  constructor(keys, anchorKey, currentKey) {
    super(keys), keys instanceof _$e40ea825a81a3709$export$52baac22726c72bf ? (this.anchorKey = anchorKey ?? keys.anchorKey, this.currentKey = currentKey ?? keys.currentKey) : (this.anchorKey = anchorKey ?? null, this.currentKey = currentKey ?? null);
  }
};

// ../node_modules/@react-stately/selection/dist/useMultipleSelectionState.mjs
import { useRef as $6tM1y$useRef, useState as $6tM1y$useState, useMemo as $6tM1y$useMemo, useEffect as $6tM1y$useEffect } from "react";
function $7af3f5b51489e0b5$var$equalSets(setA, setB) {
  if (setA.size !== setB.size) return !1;
  for (let item of setA)
    if (!setB.has(item)) return !1;
  return !0;
}
function $7af3f5b51489e0b5$export$253fe78d46329472(props) {
  let { selectionMode = "none", disallowEmptySelection = !1, allowDuplicateSelectionEvents, selectionBehavior: selectionBehaviorProp = "toggle", disabledBehavior = "all" } = props, isFocusedRef = $6tM1y$useRef(!1), [, setFocused] = $6tM1y$useState(!1), focusedKeyRef = $6tM1y$useRef(null), childFocusStrategyRef = $6tM1y$useRef(null), [, setFocusedKey] = $6tM1y$useState(null), selectedKeysProp = $6tM1y$useMemo(() => $7af3f5b51489e0b5$var$convertSelection(props.selectedKeys), [
    props.selectedKeys
  ]), defaultSelectedKeys = $6tM1y$useMemo(() => $7af3f5b51489e0b5$var$convertSelection(props.defaultSelectedKeys, new $e40ea825a81a3709$export$52baac22726c72bf()), [
    props.defaultSelectedKeys
  ]), [selectedKeys, setSelectedKeys] = $458b0a5536c1a7cf$export$40bfa8c7b0832715(selectedKeysProp, defaultSelectedKeys, props.onSelectionChange), disabledKeysProp = $6tM1y$useMemo(() => props.disabledKeys ? new Set(props.disabledKeys) : /* @__PURE__ */ new Set(), [
    props.disabledKeys
  ]), [selectionBehavior, setSelectionBehavior] = $6tM1y$useState(selectionBehaviorProp);
  selectionBehaviorProp === "replace" && selectionBehavior === "toggle" && typeof selectedKeys == "object" && selectedKeys.size === 0 && setSelectionBehavior("replace");
  let lastSelectionBehavior = $6tM1y$useRef(selectionBehaviorProp);
  return $6tM1y$useEffect(() => {
    selectionBehaviorProp !== lastSelectionBehavior.current && (setSelectionBehavior(selectionBehaviorProp), lastSelectionBehavior.current = selectionBehaviorProp);
  }, [
    selectionBehaviorProp
  ]), {
    selectionMode,
    disallowEmptySelection,
    selectionBehavior,
    setSelectionBehavior,
    get isFocused() {
      return isFocusedRef.current;
    },
    setFocused(f) {
      isFocusedRef.current = f, setFocused(f);
    },
    get focusedKey() {
      return focusedKeyRef.current;
    },
    get childFocusStrategy() {
      return childFocusStrategyRef.current;
    },
    setFocusedKey(k, childFocusStrategy = "first") {
      focusedKeyRef.current = k, childFocusStrategyRef.current = childFocusStrategy, setFocusedKey(k);
    },
    selectedKeys,
    setSelectedKeys(keys) {
      (allowDuplicateSelectionEvents || !$7af3f5b51489e0b5$var$equalSets(keys, selectedKeys)) && setSelectedKeys(keys);
    },
    disabledKeys: disabledKeysProp,
    disabledBehavior
  };
}
function $7af3f5b51489e0b5$var$convertSelection(selection, defaultValue) {
  return selection ? selection === "all" ? "all" : new $e40ea825a81a3709$export$52baac22726c72bf(selection) : defaultValue;
}

// ../node_modules/@react-stately/selection/dist/SelectionManager.mjs
var $d496c0a20b6e58ec$export$6c8a5aaad13c9852 = class _$d496c0a20b6e58ec$export$6c8a5aaad13c9852 {
  /**
  * The type of selection that is allowed in the collection.
  */
  get selectionMode() {
    return this.state.selectionMode;
  }
  /**
  * Whether the collection allows empty selection.
  */
  get disallowEmptySelection() {
    return this.state.disallowEmptySelection;
  }
  /**
  * The selection behavior for the collection.
  */
  get selectionBehavior() {
    return this.state.selectionBehavior;
  }
  /**
  * Sets the selection behavior for the collection.
  */
  setSelectionBehavior(selectionBehavior) {
    this.state.setSelectionBehavior(selectionBehavior);
  }
  /**
  * Whether the collection is currently focused.
  */
  get isFocused() {
    return this.state.isFocused;
  }
  /**
  * Sets whether the collection is focused.
  */
  setFocused(isFocused) {
    this.state.setFocused(isFocused);
  }
  /**
  * The current focused key in the collection.
  */
  get focusedKey() {
    return this.state.focusedKey;
  }
  /** Whether the first or last child of the focused key should receive focus. */
  get childFocusStrategy() {
    return this.state.childFocusStrategy;
  }
  /**
  * Sets the focused key.
  */
  setFocusedKey(key, childFocusStrategy) {
    (key == null || this.collection.getItem(key)) && this.state.setFocusedKey(key, childFocusStrategy);
  }
  /**
  * The currently selected keys in the collection.
  */
  get selectedKeys() {
    return this.state.selectedKeys === "all" ? new Set(this.getSelectAllKeys()) : this.state.selectedKeys;
  }
  /**
  * The raw selection value for the collection.
  * Either 'all' for select all, or a set of keys.
  */
  get rawSelection() {
    return this.state.selectedKeys;
  }
  /**
  * Returns whether a key is selected.
  */
  isSelected(key) {
    if (this.state.selectionMode === "none") return !1;
    let mappedKey = this.getKey(key);
    return mappedKey == null ? !1 : this.state.selectedKeys === "all" ? this.canSelectItem(mappedKey) : this.state.selectedKeys.has(mappedKey);
  }
  /**
  * Whether the selection is empty.
  */
  get isEmpty() {
    return this.state.selectedKeys !== "all" && this.state.selectedKeys.size === 0;
  }
  /**
  * Whether all items in the collection are selected.
  */
  get isSelectAll() {
    if (this.isEmpty) return !1;
    if (this.state.selectedKeys === "all") return !0;
    if (this._isSelectAll != null) return this._isSelectAll;
    let allKeys = this.getSelectAllKeys(), selectedKeys = this.state.selectedKeys;
    return this._isSelectAll = allKeys.every((k) => selectedKeys.has(k)), this._isSelectAll;
  }
  get firstSelectedKey() {
    let first = null;
    for (let key of this.state.selectedKeys) {
      let item = this.collection.getItem(key);
      (!first || item && $c5a24bc478652b5f$export$8c434b3a7a4dad6(this.collection, item, first) < 0) && (first = item);
    }
    var _first_key;
    return (_first_key = first?.key) !== null && _first_key !== void 0 ? _first_key : null;
  }
  get lastSelectedKey() {
    let last = null;
    for (let key of this.state.selectedKeys) {
      let item = this.collection.getItem(key);
      (!last || item && $c5a24bc478652b5f$export$8c434b3a7a4dad6(this.collection, item, last) > 0) && (last = item);
    }
    var _last_key;
    return (_last_key = last?.key) !== null && _last_key !== void 0 ? _last_key : null;
  }
  get disabledKeys() {
    return this.state.disabledKeys;
  }
  get disabledBehavior() {
    return this.state.disabledBehavior;
  }
  /**
  * Extends the selection to the given key.
  */
  extendSelection(toKey) {
    if (this.selectionMode === "none") return;
    if (this.selectionMode === "single") {
      this.replaceSelection(toKey);
      return;
    }
    let mappedToKey = this.getKey(toKey);
    if (mappedToKey == null) return;
    let selection;
    if (this.state.selectedKeys === "all") selection = new $e40ea825a81a3709$export$52baac22726c72bf([
      mappedToKey
    ], mappedToKey, mappedToKey);
    else {
      let selectedKeys = this.state.selectedKeys;
      var _selectedKeys_anchorKey;
      let anchorKey = (_selectedKeys_anchorKey = selectedKeys.anchorKey) !== null && _selectedKeys_anchorKey !== void 0 ? _selectedKeys_anchorKey : mappedToKey;
      selection = new $e40ea825a81a3709$export$52baac22726c72bf(selectedKeys, anchorKey, mappedToKey);
      var _selectedKeys_currentKey;
      for (let key of this.getKeyRange(anchorKey, (_selectedKeys_currentKey = selectedKeys.currentKey) !== null && _selectedKeys_currentKey !== void 0 ? _selectedKeys_currentKey : mappedToKey)) selection.delete(key);
      for (let key of this.getKeyRange(mappedToKey, anchorKey)) this.canSelectItem(key) && selection.add(key);
    }
    this.state.setSelectedKeys(selection);
  }
  getKeyRange(from, to) {
    let fromItem = this.collection.getItem(from), toItem = this.collection.getItem(to);
    return fromItem && toItem ? $c5a24bc478652b5f$export$8c434b3a7a4dad6(this.collection, fromItem, toItem) <= 0 ? this.getKeyRangeInternal(from, to) : this.getKeyRangeInternal(to, from) : [];
  }
  getKeyRangeInternal(from, to) {
    var _this_layoutDelegate;
    if (!((_this_layoutDelegate = this.layoutDelegate) === null || _this_layoutDelegate === void 0) && _this_layoutDelegate.getKeyRange) return this.layoutDelegate.getKeyRange(from, to);
    let keys = [], key = from;
    for (; key != null; ) {
      let item = this.collection.getItem(key);
      if (item && (item.type === "item" || item.type === "cell" && this.allowsCellSelection) && keys.push(key), key === to) return keys;
      key = this.collection.getKeyAfter(key);
    }
    return [];
  }
  getKey(key) {
    let item = this.collection.getItem(key);
    if (!item || item.type === "cell" && this.allowsCellSelection) return key;
    for (; item && item.type !== "item" && item.parentKey != null; ) item = this.collection.getItem(item.parentKey);
    return !item || item.type !== "item" ? null : item.key;
  }
  /**
  * Toggles whether the given key is selected.
  */
  toggleSelection(key) {
    if (this.selectionMode === "none") return;
    if (this.selectionMode === "single" && !this.isSelected(key)) {
      this.replaceSelection(key);
      return;
    }
    let mappedKey = this.getKey(key);
    if (mappedKey == null) return;
    let keys = new $e40ea825a81a3709$export$52baac22726c72bf(this.state.selectedKeys === "all" ? this.getSelectAllKeys() : this.state.selectedKeys);
    keys.has(mappedKey) ? keys.delete(mappedKey) : this.canSelectItem(mappedKey) && (keys.add(mappedKey), keys.anchorKey = mappedKey, keys.currentKey = mappedKey), !(this.disallowEmptySelection && keys.size === 0) && this.state.setSelectedKeys(keys);
  }
  /**
  * Replaces the selection with only the given key.
  */
  replaceSelection(key) {
    if (this.selectionMode === "none") return;
    let mappedKey = this.getKey(key);
    if (mappedKey == null) return;
    let selection = this.canSelectItem(mappedKey) ? new $e40ea825a81a3709$export$52baac22726c72bf([
      mappedKey
    ], mappedKey, mappedKey) : new $e40ea825a81a3709$export$52baac22726c72bf();
    this.state.setSelectedKeys(selection);
  }
  /**
  * Replaces the selection with the given keys.
  */
  setSelectedKeys(keys) {
    if (this.selectionMode === "none") return;
    let selection = new $e40ea825a81a3709$export$52baac22726c72bf();
    for (let key of keys) {
      let mappedKey = this.getKey(key);
      if (mappedKey != null && (selection.add(mappedKey), this.selectionMode === "single"))
        break;
    }
    this.state.setSelectedKeys(selection);
  }
  getSelectAllKeys() {
    let keys = [], addKeys = (key) => {
      for (; key != null; ) {
        if (this.canSelectItem(key)) {
          var _getFirstItem;
          let item = this.collection.getItem(key);
          item?.type === "item" && keys.push(key);
          var _getFirstItem_key;
          item?.hasChildNodes && (this.allowsCellSelection || item.type !== "item") && addKeys((_getFirstItem_key = (_getFirstItem = $c5a24bc478652b5f$export$fbdeaa6a76694f71($c5a24bc478652b5f$export$1005530eda016c13(item, this.collection))) === null || _getFirstItem === void 0 ? void 0 : _getFirstItem.key) !== null && _getFirstItem_key !== void 0 ? _getFirstItem_key : null);
        }
        key = this.collection.getKeyAfter(key);
      }
    };
    return addKeys(this.collection.getFirstKey()), keys;
  }
  /**
  * Selects all items in the collection.
  */
  selectAll() {
    !this.isSelectAll && this.selectionMode === "multiple" && this.state.setSelectedKeys("all");
  }
  /**
  * Removes all keys from the selection.
  */
  clearSelection() {
    !this.disallowEmptySelection && (this.state.selectedKeys === "all" || this.state.selectedKeys.size > 0) && this.state.setSelectedKeys(new $e40ea825a81a3709$export$52baac22726c72bf());
  }
  /**
  * Toggles between select all and an empty selection.
  */
  toggleSelectAll() {
    this.isSelectAll ? this.clearSelection() : this.selectAll();
  }
  select(key, e) {
    this.selectionMode !== "none" && (this.selectionMode === "single" ? this.isSelected(key) && !this.disallowEmptySelection ? this.toggleSelection(key) : this.replaceSelection(key) : this.selectionBehavior === "toggle" || e && (e.pointerType === "touch" || e.pointerType === "virtual") ? this.toggleSelection(key) : this.replaceSelection(key));
  }
  /**
  * Returns whether the current selection is equal to the given selection.
  */
  isSelectionEqual(selection) {
    if (selection === this.state.selectedKeys) return !0;
    let selectedKeys = this.selectedKeys;
    if (selection.size !== selectedKeys.size) return !1;
    for (let key of selection)
      if (!selectedKeys.has(key)) return !1;
    for (let key of selectedKeys)
      if (!selection.has(key)) return !1;
    return !0;
  }
  canSelectItem(key) {
    var _item_props;
    if (this.state.selectionMode === "none" || this.state.disabledKeys.has(key)) return !1;
    let item = this.collection.getItem(key);
    return !(!item || !(item == null || (_item_props = item.props) === null || _item_props === void 0) && _item_props.isDisabled || item.type === "cell" && !this.allowsCellSelection);
  }
  isDisabled(key) {
    var _this_collection_getItem_props, _this_collection_getItem;
    return this.state.disabledBehavior === "all" && (this.state.disabledKeys.has(key) || !!(!((_this_collection_getItem = this.collection.getItem(key)) === null || _this_collection_getItem === void 0 || (_this_collection_getItem_props = _this_collection_getItem.props) === null || _this_collection_getItem_props === void 0) && _this_collection_getItem_props.isDisabled));
  }
  isLink(key) {
    var _this_collection_getItem_props, _this_collection_getItem;
    return !!(!((_this_collection_getItem = this.collection.getItem(key)) === null || _this_collection_getItem === void 0 || (_this_collection_getItem_props = _this_collection_getItem.props) === null || _this_collection_getItem_props === void 0) && _this_collection_getItem_props.href);
  }
  getItemProps(key) {
    var _this_collection_getItem;
    return (_this_collection_getItem = this.collection.getItem(key)) === null || _this_collection_getItem === void 0 ? void 0 : _this_collection_getItem.props;
  }
  withCollection(collection) {
    return new _$d496c0a20b6e58ec$export$6c8a5aaad13c9852(collection, this.state, {
      allowsCellSelection: this.allowsCellSelection,
      layoutDelegate: this.layoutDelegate || void 0
    });
  }
  constructor(collection, state, options) {
    this.collection = collection, this.state = state;
    var _options_allowsCellSelection;
    this.allowsCellSelection = (_options_allowsCellSelection = options?.allowsCellSelection) !== null && _options_allowsCellSelection !== void 0 ? _options_allowsCellSelection : !1, this._isSelectAll = null, this.layoutDelegate = options?.layoutDelegate || null;
  }
};

// ../node_modules/@react-stately/tree/dist/useTreeState.mjs
import { useMemo as $75HV2$useMemo, useCallback as $75HV2$useCallback, useEffect as $75HV2$useEffect } from "react";
function $875d6693e12af071$export$728d6ba534403756(props) {
  let { onExpandedChange } = props, [expandedKeys, setExpandedKeys] = $458b0a5536c1a7cf$export$40bfa8c7b0832715(props.expandedKeys ? new Set(props.expandedKeys) : void 0, props.defaultExpandedKeys ? new Set(props.defaultExpandedKeys) : /* @__PURE__ */ new Set(), onExpandedChange), selectionState = $7af3f5b51489e0b5$export$253fe78d46329472(props), disabledKeys = $75HV2$useMemo(() => props.disabledKeys ? new Set(props.disabledKeys) : /* @__PURE__ */ new Set(), [
    props.disabledKeys
  ]), tree = $7613b1592d41b092$export$6cd28814d92fa9c9(props, $75HV2$useCallback((nodes) => new $05ca4cd7c4a5a999$export$863faf230ee2118a(nodes, {
    expandedKeys
  }), [
    expandedKeys
  ]), null);
  return $75HV2$useEffect(() => {
    selectionState.focusedKey != null && !tree.getItem(selectionState.focusedKey) && selectionState.setFocusedKey(null);
  }, [
    tree,
    selectionState.focusedKey
  ]), {
    collection: tree,
    expandedKeys,
    disabledKeys,
    toggleKey: (key) => {
      setExpandedKeys($875d6693e12af071$var$toggleKey(expandedKeys, key));
    },
    setExpandedKeys,
    selectionManager: new $d496c0a20b6e58ec$export$6c8a5aaad13c9852(tree, selectionState)
  };
}
function $875d6693e12af071$var$toggleKey(set, key) {
  let res = new Set(set);
  return res.has(key) ? res.delete(key) : res.add(key), res;
}

// ../node_modules/react-aria-components/dist/Menu.mjs
import $kM2ZM$react, { createContext as $kM2ZM$createContext, useRef as $kM2ZM$useRef, useState as $kM2ZM$useState, useCallback as $kM2ZM$useCallback, useContext as $kM2ZM$useContext, forwardRef as $kM2ZM$forwardRef, useMemo as $kM2ZM$useMemo } from "react";
var $3674c52c6b3c5bce$export$c7e742effb1c51e2 = $kM2ZM$createContext(null), $3674c52c6b3c5bce$export$24aad8519b95b41b = $kM2ZM$createContext(null), $3674c52c6b3c5bce$export$795aec4671cbae19 = $kM2ZM$createContext(null), $3674c52c6b3c5bce$var$SelectionManagerContext = $kM2ZM$createContext(null);
var $3674c52c6b3c5bce$var$SubmenuTriggerContext = $kM2ZM$createContext(null), $3674c52c6b3c5bce$var$SubmenuTriggerNode = class extends $23b9f4fcf0fe224b$export$d68d59712b04d9d1 {
  filter(collection, newCollection, filterFn) {
    let triggerNode = collection.getItem(this.firstChildKey);
    if (triggerNode && filterFn(triggerNode.textValue, this)) {
      let clone = this.clone();
      return newCollection.addDescendants(clone, collection), clone;
    }
    return null;
  }
};
$3674c52c6b3c5bce$var$SubmenuTriggerNode.type = "submenutrigger";
var $3674c52c6b3c5bce$export$ecabc99eeffab7ca = $e1995378a142960e$export$e953bb1cd0f19726($3674c52c6b3c5bce$var$SubmenuTriggerNode, (props, ref, item) => {
  let { CollectionBranch } = $kM2ZM$useContext($7135fc7d473fd974$export$4feb769f8ddf26c5), state = $kM2ZM$useContext($3674c52c6b3c5bce$export$24aad8519b95b41b), rootMenuTriggerState = $kM2ZM$useContext($3674c52c6b3c5bce$export$795aec4671cbae19), submenuTriggerState = $e5614764aa47eb35$export$cfc51cf86138bf98({
    triggerKey: item.key
  }, rootMenuTriggerState), submenuRef = $kM2ZM$useRef(null), itemRef = $df56164dff5785e2$export$4338b53315abf666(ref), { parentMenuRef, shouldUseVirtualFocus } = $kM2ZM$useContext($3674c52c6b3c5bce$var$SubmenuTriggerContext), { submenuTriggerProps, submenuProps, popoverProps } = $0065b146e7192841$export$7138b0d059a6e743({
    parentMenuRef,
    submenuRef,
    delay: props.delay,
    shouldUseVirtualFocus
  }, submenuTriggerState, itemRef);
  return $kM2ZM$react.createElement($64fa3d84918910a7$export$2881499e37b75b9a, {
    values: [
      [
        $3674c52c6b3c5bce$var$MenuItemContext,
        {
          ...submenuTriggerProps,
          onAction: void 0,
          ref: itemRef
        }
      ],
      [
        $3674c52c6b3c5bce$export$c7e742effb1c51e2,
        {
          ref: submenuRef,
          ...submenuProps
        }
      ],
      [
        $de32f1b87079253c$export$d2f961adcb0afbe,
        submenuTriggerState
      ],
      [
        $07b14b47974efb58$export$9b9a0cd73afb7ca4,
        {
          trigger: "SubmenuTrigger",
          triggerRef: itemRef,
          placement: "end top",
          "aria-labelledby": submenuProps["aria-labelledby"],
          ...popoverProps
        }
      ]
    ]
  }, $kM2ZM$react.createElement(CollectionBranch, {
    collection: state.collection,
    parent: item
  }), props.children[1]);
}, (props) => props.children[0]), $3674c52c6b3c5bce$export$d9b273488cd8ce6f = $kM2ZM$forwardRef(function(props, ref) {
  return [props, ref] = $64fa3d84918910a7$export$29f1550f4b0d4415(props, ref, $3674c52c6b3c5bce$export$c7e742effb1c51e2), $kM2ZM$react.createElement($e1995378a142960e$export$bf788dd355e3a401, {
    content: $kM2ZM$react.createElement($e1995378a142960e$export$fb8073518f34e6ec, props)
  }, (collection) => $kM2ZM$react.createElement($3674c52c6b3c5bce$var$MenuInner, {
    props,
    collection,
    menuRef: ref
  }));
});
function $3674c52c6b3c5bce$var$MenuInner({ props, collection, menuRef: ref }) {
  [props, ref] = $64fa3d84918910a7$export$29f1550f4b0d4415(props, ref, $8e6cc465cc68f603$export$b0d3ecf7112093a7);
  let { filter, ...autocompleteMenuProps } = props, filteredCollection = $kM2ZM$useMemo(() => filter ? collection.filter(filter) : collection, [
    collection,
    filter
  ]), state = $875d6693e12af071$export$728d6ba534403756({
    ...props,
    collection: filteredCollection,
    children: void 0
  }), triggerState = $kM2ZM$useContext($3674c52c6b3c5bce$export$795aec4671cbae19), { isVirtualized, CollectionRoot } = $kM2ZM$useContext($7135fc7d473fd974$export$4feb769f8ddf26c5), { menuProps } = $d5336fe17ce95402$export$38eaa17faae8f579({
    ...props,
    isVirtualized,
    onClose: props.onClose || triggerState?.close
  }, state, ref), renderProps = $64fa3d84918910a7$export$4d86445c2cf5e3({
    defaultClassName: "react-aria-Menu",
    className: props.className,
    style: props.style,
    values: {
      isEmpty: state.collection.size === 0
    }
  }), emptyState = null;
  state.collection.size === 0 && props.renderEmptyState && (emptyState = $kM2ZM$react.createElement("div", {
    role: "menuitem",
    style: {
      display: "contents"
    }
  }, props.renderEmptyState()));
  let DOMProps = $65484d02dcb7eb3e$export$457c3d6518dd4c6f(props, {
    global: !0
  });
  return $kM2ZM$react.createElement($9bf71ea28793e738$export$20e40289641fbbb6, null, $kM2ZM$react.createElement("div", {
    ...$3ef42575df84b30b$export$9d1611c77c2fe928(DOMProps, renderProps, menuProps),
    ref,
    slot: props.slot || void 0,
    "data-empty": state.collection.size === 0 || void 0,
    onScroll: props.onScroll
  }, $kM2ZM$react.createElement($64fa3d84918910a7$export$2881499e37b75b9a, {
    values: [
      [
        $3674c52c6b3c5bce$export$24aad8519b95b41b,
        state
      ],
      [
        $431f98aba6844401$export$6615d83f6de245ce,
        {
          elementType: "div"
        }
      ],
      [
        $7135fc7d473fd974$export$d40e14dec8b060a8,
        {
          name: "MenuSection",
          render: $3674c52c6b3c5bce$var$MenuSectionInner
        }
      ],
      [
        $3674c52c6b3c5bce$var$SubmenuTriggerContext,
        {
          parentMenuRef: ref,
          shouldUseVirtualFocus: autocompleteMenuProps?.shouldUseVirtualFocus
        }
      ],
      [
        $3674c52c6b3c5bce$var$MenuItemContext,
        null
      ],
      [
        $8e6cc465cc68f603$export$b0d3ecf7112093a7,
        null
      ],
      [
        $8e6cc465cc68f603$export$698f465ec27e93df,
        null
      ],
      [
        $3674c52c6b3c5bce$var$SelectionManagerContext,
        state.selectionManager
      ],
      /* Ensure root MenuTriggerState is defined, in case Menu is rendered outside a MenuTrigger. */
      /* We assume the context can never change between defined and undefined. */
      /* eslint-disable-next-line react-hooks/rules-of-hooks */
      [
        $3674c52c6b3c5bce$export$795aec4671cbae19,
        triggerState ?? $a28c903ee9ad8dc5$export$79fefeb1c2091ac3({})
      ]
    ]
  }, $kM2ZM$react.createElement(CollectionRoot, {
    collection: state.collection,
    persistedKeys: $7135fc7d473fd974$export$90e00781bc59d8f9(state.selectionManager.focusedKey),
    scrollRef: ref
  })), emptyState));
}
var $3674c52c6b3c5bce$var$GroupSelectionManager = class extends $d496c0a20b6e58ec$export$6c8a5aaad13c9852 {
  get focusedKey() {
    return this.parent.focusedKey;
  }
  get isFocused() {
    return this.parent.isFocused;
  }
  setFocusedKey(key, childFocusStrategy) {
    return this.parent.setFocusedKey(key, childFocusStrategy);
  }
  setFocused(isFocused) {
    this.parent.setFocused(isFocused);
  }
  get childFocusStrategy() {
    return this.parent.childFocusStrategy;
  }
  constructor(parent, state) {
    super(parent.collection, state), this.parent = parent;
  }
};
function $3674c52c6b3c5bce$var$MenuSectionInner(props, ref, section, className = "react-aria-MenuSection") {
  var _section_props, _section_props1;
  let state = $kM2ZM$useContext($3674c52c6b3c5bce$export$24aad8519b95b41b), { CollectionBranch } = $kM2ZM$useContext($7135fc7d473fd974$export$4feb769f8ddf26c5), [headingRef, heading] = $64fa3d84918910a7$export$9d4c57ee4c6ffdd8();
  var _section_props_arialabel;
  let { headingProps, groupProps } = $3e5eb2498db5b506$export$73f7a44322579622({
    heading,
    "aria-label": (_section_props_arialabel = section.props["aria-label"]) !== null && _section_props_arialabel !== void 0 ? _section_props_arialabel : void 0
  }), renderProps = $64fa3d84918910a7$export$4d86445c2cf5e3({
    defaultClassName: className,
    className: (_section_props = section.props) === null || _section_props === void 0 ? void 0 : _section_props.className,
    style: (_section_props1 = section.props) === null || _section_props1 === void 0 ? void 0 : _section_props1.style,
    values: {}
  }), parent = $kM2ZM$useContext($3674c52c6b3c5bce$var$SelectionManagerContext), selectionState = $7af3f5b51489e0b5$export$253fe78d46329472(props), manager = props.selectionMode != null ? new $3674c52c6b3c5bce$var$GroupSelectionManager(parent, selectionState) : parent, DOMProps = $65484d02dcb7eb3e$export$457c3d6518dd4c6f(props, {
    global: !0
  });
  return delete DOMProps.id, $kM2ZM$react.createElement("section", {
    ...$3ef42575df84b30b$export$9d1611c77c2fe928(DOMProps, renderProps, groupProps),
    ref
  }, $kM2ZM$react.createElement($64fa3d84918910a7$export$2881499e37b75b9a, {
    values: [
      [
        $72a5793c14baf454$export$e0e4026c12a8bdbb,
        {
          ...headingProps,
          ref: headingRef
        }
      ],
      [
        $3674c52c6b3c5bce$var$SelectionManagerContext,
        manager
      ]
    ]
  }, $kM2ZM$react.createElement(CollectionBranch, {
    collection: state.collection,
    parent: section
  })));
}
var $3674c52c6b3c5bce$export$4b1545b4f2016d26 = $e1995378a142960e$export$e953bb1cd0f19726($23b9f4fcf0fe224b$export$437f11dc9b403b78, $3674c52c6b3c5bce$var$MenuSectionInner), $3674c52c6b3c5bce$var$MenuItemContext = $kM2ZM$createContext(null), $3674c52c6b3c5bce$export$2ce376c2cc3355c8 = $e1995378a142960e$export$18af5c7a9e9b3664($23b9f4fcf0fe224b$export$fd11f34e1d07f134, function(props, forwardedRef, item) {
  var _useSlottedContext;
  [props, forwardedRef] = $64fa3d84918910a7$export$29f1550f4b0d4415(props, forwardedRef, $3674c52c6b3c5bce$var$MenuItemContext);
  let id = (_useSlottedContext = $64fa3d84918910a7$export$fabf2dc03a41866e($3674c52c6b3c5bce$var$MenuItemContext)) === null || _useSlottedContext === void 0 ? void 0 : _useSlottedContext.id, state = $kM2ZM$useContext($3674c52c6b3c5bce$export$24aad8519b95b41b), ref = $df56164dff5785e2$export$4338b53315abf666(forwardedRef), selectionManager = $kM2ZM$useContext($3674c52c6b3c5bce$var$SelectionManagerContext), { menuItemProps, labelProps, descriptionProps, keyboardShortcutProps, ...states } = $a2e5df62f93c7633$export$9d32628fc2aea7da({
    ...props,
    id,
    key: item.key,
    selectionManager
  }, state, ref), { hoverProps, isHovered } = $6179b936705e76d3$export$ae780daf29e6d456({
    isDisabled: states.isDisabled
  }), renderProps = $64fa3d84918910a7$export$4d86445c2cf5e3({
    ...props,
    id: void 0,
    children: item.rendered,
    defaultClassName: "react-aria-MenuItem",
    values: {
      ...states,
      isHovered,
      isFocusVisible: states.isFocusVisible,
      selectionMode: selectionManager.selectionMode,
      selectionBehavior: selectionManager.selectionBehavior,
      hasSubmenu: !!props["aria-haspopup"],
      isOpen: props["aria-expanded"] === "true"
    }
  }), ElementType = props.href ? "a" : "div", DOMProps = $65484d02dcb7eb3e$export$457c3d6518dd4c6f(props, {
    global: !0
  });
  return delete DOMProps.id, delete DOMProps.onClick, $kM2ZM$react.createElement(ElementType, {
    ...$3ef42575df84b30b$export$9d1611c77c2fe928(DOMProps, renderProps, menuItemProps, hoverProps),
    ref,
    "data-disabled": states.isDisabled || void 0,
    "data-hovered": isHovered || void 0,
    "data-focused": states.isFocused || void 0,
    "data-focus-visible": states.isFocusVisible || void 0,
    "data-pressed": states.isPressed || void 0,
    "data-selected": states.isSelected || void 0,
    "data-selection-mode": selectionManager.selectionMode === "none" ? void 0 : selectionManager.selectionMode,
    "data-has-submenu": !!props["aria-haspopup"] || void 0,
    "data-open": props["aria-expanded"] === "true" || void 0
  }, $kM2ZM$react.createElement($64fa3d84918910a7$export$2881499e37b75b9a, {
    values: [
      [
        $514c0188e459b4c0$export$9afb8bc826b033ea,
        {
          slots: {
            [$64fa3d84918910a7$export$c62b8e45d58ddad9]: labelProps,
            label: labelProps,
            description: descriptionProps
          }
        }
      ],
      [
        $63df2425e2108aa8$export$744d98a3b8a94e1c,
        keyboardShortcutProps
      ]
    ]
  }, renderProps.children));
});

// ../node_modules/@react-aria/dialog/dist/useDialog.mjs
import { useRef as $i6df2$useRef, useEffect as $i6df2$useEffect } from "react";
function $40df3f8667284809$export$d55e7ee900f34e93(props, ref) {
  let { role = "dialog" } = props, titleId = $bdb11010cef70236$export$b4cc09c592e8fdb8();
  titleId = props["aria-label"] ? void 0 : titleId;
  let isRefocusing = $i6df2$useRef(!1);
  return $i6df2$useEffect(() => {
    if (ref.current && !ref.current.contains(document.activeElement)) {
      $3ad3f6e1647bc98d$export$80f3e147d781571c(ref.current);
      let timeout = setTimeout(() => {
        (document.activeElement === ref.current || document.activeElement === document.body) && (isRefocusing.current = !0, ref.current && (ref.current.blur(), $3ad3f6e1647bc98d$export$80f3e147d781571c(ref.current)), isRefocusing.current = !1);
      }, 500);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [
    ref
  ]), $337b884510726a0d$export$14c98a7594375490(), {
    dialogProps: {
      ...$65484d02dcb7eb3e$export$457c3d6518dd4c6f(props, {
        labelable: !0
      }),
      role,
      tabIndex: -1,
      "aria-labelledby": props["aria-labelledby"] || titleId,
      // Prevent blur events from reaching useOverlay, which may cause
      // popovers to close. Since focus is contained within the dialog,
      // we don't want this to occur due to the above useEffect.
      onBlur: (e) => {
        isRefocusing.current && e.stopPropagation();
      }
    },
    titleProps: {
      id: titleId
    }
  };
}

// ../node_modules/react-aria-components/dist/Dialog.mjs
import $6IYYA$react, { createContext as $6IYYA$createContext, useRef as $6IYYA$useRef, useState as $6IYYA$useState, useCallback as $6IYYA$useCallback, forwardRef as $6IYYA$forwardRef, useContext as $6IYYA$useContext } from "react";
var $de32f1b87079253c$export$8b93a07348a7730c = $6IYYA$createContext(null), $de32f1b87079253c$export$d2f961adcb0afbe = $6IYYA$createContext(null);
function $de32f1b87079253c$export$2e1e1122cf0cba88(props) {
  let state = $a28c903ee9ad8dc5$export$79fefeb1c2091ac3(props), buttonRef = $6IYYA$useRef(null), { triggerProps, overlayProps } = $628037886ba31236$export$f9d5c8beee7d008d({
    type: "dialog"
  }, state, buttonRef), [buttonWidth, setButtonWidth] = $6IYYA$useState(null), onResize = $6IYYA$useCallback(() => {
    buttonRef.current && setButtonWidth(buttonRef.current.offsetWidth + "px");
  }, [
    buttonRef
  ]);
  return $9daab02d461809db$export$683480f191c0e3ea({
    ref: buttonRef,
    onResize
  }), triggerProps.id = $bdb11010cef70236$export$f680877a34711e37(), overlayProps["aria-labelledby"] = triggerProps.id, $6IYYA$react.createElement($64fa3d84918910a7$export$2881499e37b75b9a, {
    values: [
      [
        $de32f1b87079253c$export$d2f961adcb0afbe,
        state
      ],
      [
        $3674c52c6b3c5bce$export$795aec4671cbae19,
        state
      ],
      [
        $de32f1b87079253c$export$8b93a07348a7730c,
        overlayProps
      ],
      [
        $07b14b47974efb58$export$9b9a0cd73afb7ca4,
        {
          trigger: "DialogTrigger",
          triggerRef: buttonRef,
          "aria-labelledby": overlayProps["aria-labelledby"],
          style: {
            "--trigger-width": buttonWidth
          }
        }
      ]
    ]
  }, $6IYYA$react.createElement($f1ab8c75478c6f73$export$3351871ee4b288b8, {
    ...triggerProps,
    ref: buttonRef,
    isPressed: state.isOpen
  }, props.children));
}
var $de32f1b87079253c$export$3ddf2d174ce01153 = $6IYYA$forwardRef(function(props, ref) {
  let originalAriaLabelledby = props["aria-labelledby"];
  [props, ref] = $64fa3d84918910a7$export$29f1550f4b0d4415(props, ref, $de32f1b87079253c$export$8b93a07348a7730c);
  let { dialogProps, titleProps } = $40df3f8667284809$export$d55e7ee900f34e93({
    ...props,
    // Only pass aria-labelledby from props, not context.
    // Context is used as a fallback below.
    "aria-labelledby": originalAriaLabelledby
  }, ref), state = $6IYYA$useContext($de32f1b87079253c$export$d2f961adcb0afbe);
  !dialogProps["aria-label"] && !dialogProps["aria-labelledby"] && (props["aria-labelledby"] ? dialogProps["aria-labelledby"] = props["aria-labelledby"] : process.env.NODE_ENV !== "production" && console.warn('If a Dialog does not contain a <Heading slot="title">, it must have an aria-label or aria-labelledby attribute for accessibility.'));
  let renderProps = $64fa3d84918910a7$export$4d86445c2cf5e3({
    defaultClassName: "react-aria-Dialog",
    className: props.className,
    style: props.style,
    children: props.children,
    values: {
      close: state?.close || (() => {
      })
    }
  }), DOMProps = $65484d02dcb7eb3e$export$457c3d6518dd4c6f(props, {
    global: !0
  });
  return $6IYYA$react.createElement("section", {
    ...$3ef42575df84b30b$export$9d1611c77c2fe928(DOMProps, renderProps, dialogProps),
    ref,
    slot: props.slot || void 0
  }, $6IYYA$react.createElement($64fa3d84918910a7$export$2881499e37b75b9a, {
    values: [
      [
        $4e85f108e88277b8$export$d688439359537581,
        {
          slots: {
            [$64fa3d84918910a7$export$c62b8e45d58ddad9]: {},
            title: {
              ...titleProps,
              level: 2
            }
          }
        }
      ],
      [
        $d2b4bc8c273e7be6$export$24d547caef80ccd1,
        {
          slots: {
            [$64fa3d84918910a7$export$c62b8e45d58ddad9]: {},
            close: {
              onPress: () => state?.close()
            }
          }
        }
      ]
    ]
  }, renderProps.children));
});

// src/components/components/Popover/PopoverProvider.tsx
var PopoverProvider = ({
  placement: placementProp = "bottom-start",
  hasChrome = !0,
  hasCloseButton = !1,
  closeLabel,
  offset = 8,
  padding,
  popover,
  children,
  defaultVisible,
  visible,
  onVisibleChange,
  ...props
}) => {
  let placement = convertToReactAriaPlacement(placementProp), [isOpen, setIsOpen] = useState12(defaultVisible ?? !1), onOpenChange = useCallback9(
    (isOpen2) => {
      setIsOpen(isOpen2), onVisibleChange?.(isOpen2);
    },
    [onVisibleChange]
  ), onHide = useCallback9(() => setIsOpen(!1), []);
  return React38.createElement(
    $de32f1b87079253c$export$2e1e1122cf0cba88,
    {
      defaultOpen: defaultVisible,
      isOpen: visible ?? isOpen,
      onOpenChange,
      ...props
    },
    React38.createElement($3b117e43dc0ca95d$export$27c701ed9e449e99, null, children),
    React38.createElement($07b14b47974efb58$export$5b6b19405a83ff9d, { placement, offset, style: { outline: "none" } }, React38.createElement(
      Popover,
      {
        hasChrome,
        hideLabel: closeLabel,
        onHide: hasCloseButton ? onHide : void 0,
        padding
      },
      typeof popover == "function" ? popover({ onHide }) : popover
    ))
  );
};

// src/components/components/tooltip/Tooltip.tsx
import React39, { forwardRef as forwardRef13 } from "react";
var Tooltip2 = forwardRef13((props, ref) => React39.createElement(Popover, { ref, ...props }));
Tooltip2.displayName = "Tooltip";

// src/components/components/tooltip/lazy-WithTooltip.tsx
import React40, { Suspense as Suspense2, lazy as lazy2 } from "react";
var LazyWithTooltip = lazy2(
  () => import("../_browser-chunks/WithTooltip-IO6J4KBT.js").then((mod) => ({ default: mod.WithTooltip }))
), WithTooltip = (props) => React40.createElement(Suspense2, { fallback: React40.createElement("div", null) }, React40.createElement(LazyWithTooltip, { ...props })), LazyWithTooltipPure = lazy2(
  () => import("../_browser-chunks/WithTooltip-IO6J4KBT.js").then((mod) => ({ default: mod.WithTooltipPure }))
), WithTooltipPure = (props) => React40.createElement(Suspense2, { fallback: React40.createElement("div", null) }, React40.createElement(LazyWithTooltipPure, { ...props }));

// src/components/components/tooltip/TooltipMessage.tsx
import React41 from "react";
import { deprecate as deprecate5 } from "storybook/internal/client-logger";
import { styled as styled49 } from "storybook/theming";
var Title4 = styled49.div(({ theme }) => ({
  fontWeight: theme.typography.weight.bold
})), Desc2 = styled49.span(), Links = styled49.div(({ theme }) => ({
  marginTop: 8,
  textAlign: "center",
  "> *": {
    margin: "0 8px",
    fontWeight: theme.typography.weight.bold
  }
})), Message2 = styled49.div(({ theme }) => ({
  color: theme.color.defaultText,
  lineHeight: "18px"
})), MessageWrapper = styled49.div({
  padding: 15,
  width: 280,
  boxSizing: "border-box"
}), TooltipMessage = ({ title, desc, links }) => (deprecate5(
  "`TooltipMessage` is deprecated and will be removed in Storybook 11, use `Popover` and `PopoverProvider` instead."
), React41.createElement(MessageWrapper, { "data-deprecated": "TooltipMessage" }, React41.createElement(Message2, null, title && React41.createElement(Title4, null, title), desc && React41.createElement(Desc2, null, desc)), links && React41.createElement(Links, null, links.map(({ title: linkTitle, ...other }) => React41.createElement(Link2, { ...other, key: linkTitle }, linkTitle)))));

// src/components/components/tooltip/TooltipLinkList.tsx
import React43, { Fragment as Fragment4, useCallback as useCallback10 } from "react";
import { deprecate as deprecate7 } from "storybook/internal/client-logger";
import { styled as styled51 } from "storybook/theming";

// src/components/components/tooltip/ListItem.tsx
var import_memoizerific2 = __toESM(require_memoizerific(), 1);
import React42, { forwardRef as forwardRef14 } from "react";
import { deprecate as deprecate6 } from "storybook/internal/client-logger";
import { styled as styled50 } from "storybook/theming";
var Title5 = styled50(({ active, loading, disabled, ...rest }) => React42.createElement("span", { ...rest }))(
  ({ theme }) => ({
    color: theme.color.defaultText,
    // Previously was theme.typography.weight.normal but this weight does not exists in Theme
    fontWeight: theme.typography.weight.regular
  }),
  ({ active, theme }) => active ? {
    color: theme.color.secondary,
    fontWeight: theme.typography.weight.bold
  } : {},
  ({ loading, theme }) => loading ? {
    display: "inline-block",
    flex: "none",
    ...theme.animation.inlineGlow
  } : {},
  ({ disabled, theme }) => disabled ? {
    color: theme.textMutedColor
  } : {}
), Right = styled50.span({
  display: "flex",
  "& svg": {
    height: 12,
    width: 12,
    margin: "3px 0",
    verticalAlign: "top"
  }
}), Center = styled50.span(
  {
    flex: 1,
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    minWidth: 0
    // required for overflow
  },
  ({ isIndented }) => isIndented ? { marginLeft: 24 } : {}
), CenterText = styled50.span(
  ({ theme }) => ({
    fontSize: "11px",
    lineHeight: "14px"
  }),
  ({ active, theme }) => active ? {
    color: theme.color.secondary
  } : {},
  ({ theme, disabled }) => disabled ? {
    color: theme.textMutedColor
  } : {}
), Left = styled50.span(
  ({ active, theme }) => active ? {
    color: theme.color.secondary
  } : {},
  () => ({
    display: "flex",
    maxWidth: 14
  })
), Item2 = styled50.button(
  ({ theme }) => ({
    width: "100%",
    minWidth: 0,
    // required for overflow
    border: "none",
    borderRadius: theme.appBorderRadius,
    background: "none",
    fontSize: theme.typography.size.s1,
    transition: "background 150ms ease-out",
    color: theme.color.dark,
    textDecoration: "none",
    justifyContent: "space-between",
    lineHeight: "18px",
    padding: "7px 10px",
    display: "flex",
    alignItems: "center",
    "& > * + *": {
      paddingLeft: 10
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.color.secondary}`,
      outlineOffset: 0
    }
  }),
  ({ theme, href, onClick }) => (href || onClick) && {
    cursor: "pointer",
    "&:hover": {
      background: theme.background.hoverable
    },
    "&:hover svg": {
      opacity: 1
    }
  },
  ({ theme, as }) => as === "label" && {
    "&:has(input:not(:disabled))": {
      cursor: "pointer",
      "&:hover": {
        background: theme.background.hoverable
      }
    }
  },
  ({ disabled }) => disabled && { cursor: "not-allowed" }
), getItemProps = (0, import_memoizerific2.default)(100)(({ onClick, input, href, LinkWrapper }) => ({
  ...onClick && {
    as: "button",
    role: "button",
    onClick
  },
  ...input && {
    as: "label"
  },
  ...href && {
    as: "a",
    role: "link",
    href,
    ...LinkWrapper && {
      as: LinkWrapper,
      to: href
    }
  }
})), ListItem = forwardRef14((props, ref) => {
  let {
    loading = !1,
    title = React42.createElement("span", null, "Loading state"),
    center = null,
    right = null,
    active = !1,
    disabled = !1,
    isIndented = !1,
    href = void 0,
    onClick = void 0,
    icon,
    input,
    LinkWrapper = void 0,
    ...rest
  } = props, commonProps = { active, disabled }, itemProps = getItemProps(props), left = icon || input;
  return deprecate6(
    "`ListItem` is deprecated and will be removed in Storybook 11, use `MenuItem` instead."
  ), React42.createElement(Item2, { "data-deprecated": "ListItem", ref, ...rest, ...commonProps, ...itemProps }, React42.createElement(React42.Fragment, null, left && React42.createElement(Left, { ...commonProps }, left), title || center ? React42.createElement(Center, { isIndented: isIndented && !left }, title && React42.createElement(Title5, { ...commonProps, loading }, title), center && React42.createElement(CenterText, { ...commonProps }, center)) : null, right && React42.createElement(Right, { ...commonProps }, right)));
});
ListItem.displayName = "ListItem";
var ListItem_default = ListItem;

// src/components/components/tooltip/TooltipLinkList.tsx
var List = styled51.div(
  {
    minWidth: 180,
    overflow: "hidden",
    overflowY: "auto",
    maxHeight: 15.5 * 32 + 8
    // 15.5 items at 32px each + 8px padding
  },
  ({ theme }) => ({
    borderRadius: theme.appBorderRadius + 2
  }),
  ({ theme }) => theme.base === "dark" ? { background: theme.background.content } : {}
), Group = styled51.div(({ theme }) => ({
  padding: 4,
  "& + &": {
    borderTop: `1px solid ${theme.appBorderColor}`
  }
})), Item3 = ({ id, onClick, ...rest }) => {
  let { active, disabled, title, href } = rest, handleClick = useCallback10(
    (event) => onClick?.(event, { id, active, disabled, title, href }),
    [onClick, id, active, disabled, title, href]
  );
  return React43.createElement(ListItem_default, { id: `list-item-${id}`, ...rest, ...onClick && { onClick: handleClick } });
}, TooltipLinkList = ({ links, LinkWrapper, ...props }) => {
  deprecate7(
    "`TooltipLinkList` is deprecated and will be removed in Storybook 11, use `ActionList` or `MenuItem` and `WithMenu` instead."
  );
  let groups = Array.isArray(links[0]) ? links : [links], isIndented = groups.some(
    (group) => group.some((link) => "icon" in link && link.icon || "input" in link && link.input)
  );
  return React43.createElement(List, { "data-deprecated": "TooltipLinkList", ...props, className: "sb-list" }, groups.filter((group) => group.length).map((group, index3) => React43.createElement(Group, { key: group.map((link) => link.id).join(`~${index3}~`) }, group.map((link) => "content" in link ? React43.createElement(Fragment4, { key: link.id }, link.content) : React43.createElement(Item3, { key: link.id, isIndented, LinkWrapper, ...link })))));
};

// src/components/components/Tabs/Tabs.tsx
import React49, { Component as Component2, forwardRef as forwardRef17, memo, useMemo as useMemo5 } from "react";
import { deprecate as deprecate12 } from "storybook/internal/client-logger";
import { sanitize as sanitize2 } from "storybook/internal/csf";
import { styled as styled57 } from "storybook/theming";

// src/components/components/Bar/Bar.tsx
import React44, { Children as Children4, forwardRef as forwardRef15 } from "react";
import { deprecate as deprecate8 } from "storybook/internal/client-logger";
import { styled as styled52 } from "storybook/theming";
var StyledBar = styled52.div(
  ({ backgroundColor, border = !1, innerStyle = {}, scrollable, theme }) => ({
    color: theme.barTextColor,
    width: "100%",
    minHeight: 40,
    flexShrink: 0,
    // TODO in Storybook 11: Apply background regardless of border.
    scrollbarColor: `${theme.barTextColor} ${border ? backgroundColor || theme.barBg : "transparent"}`,
    scrollbarWidth: "thin",
    overflow: scrollable ? "auto" : "hidden",
    overflowY: "hidden",
    display: "flex",
    alignItems: "center",
    gap: scrollable ? 0 : 6,
    paddingInline: scrollable ? 0 : 6,
    // TODO in Storybook 11: Apply background regardless of border.
    ...border ? {
      boxShadow: `${theme.appBorderColor}  0 -1px 0 0 inset`,
      background: backgroundColor || theme.barBg
    } : {},
    ...innerStyle
  })
), HeightPreserver = styled52.div(({ innerStyle }) => ({
  minHeight: 40,
  display: "flex",
  alignItems: "center",
  width: "100%",
  gap: 6,
  paddingInline: 6,
  ...innerStyle
})), Bar = forwardRef15(
  ({ scrollable = !0, children, innerStyle, ...rest }, ref) => React44.createElement(
    StyledBar,
    {
      ...rest,
      ref,
      innerStyle: scrollable ? void 0 : innerStyle,
      scrollable
    },
    scrollable ? React44.createElement(HeightPreserver, { innerStyle }, children) : children
  )
);
Bar.displayName = "Bar";
var Side = styled52.div(
  {
    display: "flex",
    whiteSpace: "nowrap",
    flexBasis: "auto",
    marginLeft: 3,
    marginRight: 10
  },
  ({ scrollable }) => scrollable ? { flexShrink: 0 } : {},
  ({ left }) => left ? {
    "& > *": {
      marginLeft: 4
    }
  } : {},
  ({ right }) => right ? {
    gap: 6
  } : {}
);
Side.displayName = "Side";
var BarInner = styled52.div(({ bgColor }) => ({
  display: "flex",
  justifyContent: "space-between",
  position: "relative",
  flexWrap: "nowrap",
  flexShrink: 0,
  height: 40,
  width: "100%",
  backgroundColor: bgColor || ""
})), BarWithoutPadding = styled52(Bar)({
  paddingInline: 0
}), FlexBar = ({ children, backgroundColor, className = "", ...rest }) => {
  deprecate8('FlexBar is deprecated. Use Bar with justifyContent: "space-between" instead.');
  let [left, right] = Children4.toArray(children);
  return React44.createElement(
    BarWithoutPadding,
    {
      "data-deprecated": "FlexBar",
      backgroundColor,
      className: `sb-bar ${className}`,
      ...rest
    },
    React44.createElement(BarInner, { bgColor: backgroundColor }, React44.createElement(Side, { scrollable: rest.scrollable, left: !0 }, left), right ? React44.createElement(Side, { right: !0 }, right) : null)
  );
};
FlexBar.displayName = "FlexBar";

// src/components/components/Tabs/Button.tsx
import React45, { forwardRef as forwardRef16 } from "react";
import { deprecate as deprecate9 } from "storybook/internal/client-logger";
import { isPropValid as isPropValid2, styled as styled53 } from "storybook/theming";
var isLink = (obj) => typeof obj.props.href == "string", isButton = (obj) => typeof obj.props.href != "string";
function ForwardRefFunction({ children, ...rest }, ref) {
  let o = { props: rest, ref };
  if (isLink(o))
    return React45.createElement("a", { ref: o.ref, ...o.props }, children);
  if (isButton(o))
    return React45.createElement("button", { ref: o.ref, type: "button", ...o.props }, children);
  throw new Error("invalid props");
}
var ButtonOrLink = forwardRef16(ForwardRefFunction);
ButtonOrLink.displayName = "ButtonOrLink";
var StyledTabButton = styled53(ButtonOrLink, { shouldForwardProp: isPropValid2 })(
  {
    whiteSpace: "normal",
    display: "inline-flex",
    overflow: "hidden",
    verticalAlign: "top",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    textDecoration: "none",
    "&:empty": {
      display: "none"
    },
    "&[hidden]": {
      display: "none"
    }
  },
  ({ theme }) => ({
    padding: "0 15px",
    transition: "color 0.2s linear, border-bottom-color 0.2s linear",
    height: 40,
    lineHeight: "12px",
    cursor: "pointer",
    background: "transparent",
    border: "0 solid transparent",
    borderTop: "3px solid transparent",
    borderBottom: "3px solid transparent",
    fontWeight: "bold",
    fontSize: 13,
    "&:focus": {
      outline: "0 none",
      borderBottomColor: theme.barSelectedColor
    }
  }),
  ({ active, textColor, theme }) => active ? {
    color: textColor || theme.barSelectedColor,
    borderBottomColor: theme.barSelectedColor
  } : {
    color: textColor || theme.barTextColor,
    borderBottomColor: "transparent",
    "&:hover": {
      color: theme.barHoverColor
    }
  }
), TabButton = forwardRef16((props, ref) => (deprecate9("The `TabButton` component is deprecated. Use `TabList` instead."), React45.createElement(StyledTabButton, { "data-deprecated": "TabButton", ref, ...props })));
TabButton.displayName = "TabButton";

// src/components/components/Tabs/EmptyTabContent.tsx
import React46 from "react";
import { styled as styled54 } from "storybook/theming";
var Wrapper3 = styled54.div(({ theme }) => ({
  height: "100%",
  display: "flex",
  padding: 30,
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "column",
  gap: 15,
  background: theme.background.content
})), Content2 = styled54.div({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  maxWidth: 415
}), Title6 = styled54.div(({ theme }) => ({
  fontWeight: theme.typography.weight.bold,
  fontSize: theme.typography.size.s2 - 1,
  textAlign: "center",
  color: theme.color.defaultText
})), Footer = styled54.div(({ theme }) => ({
  fontSize: theme.typography.size.s2 - 1
})), Description3 = styled54.div(({ theme }) => ({
  fontWeight: theme.typography.weight.regular,
  fontSize: theme.typography.size.s2 - 1,
  textAlign: "center",
  color: theme.textMutedColor
})), EmptyTabContent = ({ title, description, footer }) => React46.createElement(Wrapper3, null, React46.createElement(Content2, null, React46.createElement(Title6, null, title), description && React46.createElement(Description3, null, description)), footer && React46.createElement(Footer, null, footer));

// src/components/components/Tabs/Tabs.helpers.tsx
import React47, { Children as Children5 } from "react";
import { deprecate as deprecate10 } from "storybook/internal/client-logger";
import { styled as styled55 } from "storybook/theming";
var VisuallyHidden = styled55.div(
  ({ active }) => active ? { display: "block" } : { display: "none" }
), childrenToList = (children) => (deprecate10("The `childrenToList` tabs helper is deprecated. Use `TabsView` instead."), Children5.toArray(children).map(
  // @ts-expect-error (non strict)
  ({
    props: { title, id, color: color4, children: childrenOfChild }
  }) => {
    let content = Array.isArray(
      childrenOfChild
    ) ? childrenOfChild[0] : childrenOfChild;
    return {
      title,
      id,
      ...color4 ? { color: color4 } : {},
      render: typeof content == "function" ? content : ({ active }) => React47.createElement(VisuallyHidden, { active, role: "tabpanel" }, content)
    };
  }
));

// src/components/components/Tabs/Tabs.hooks.tsx
import React48, { useCallback as useCallback11, useLayoutEffect as useLayoutEffect3, useRef as useRef8, useState as useState13 } from "react";
import { deprecate as deprecate11 } from "storybook/internal/client-logger";
import { sanitize } from "storybook/internal/csf";
import { styled as styled56 } from "storybook/theming";
var CollapseIcon = styled56.span(({ theme, isActive }) => ({
  display: "inline-block",
  width: 0,
  height: 0,
  marginLeft: 8,
  color: isActive ? theme.color.secondary : theme.color.mediumdark,
  borderRight: "3px solid transparent",
  borderLeft: "3px solid transparent",
  borderTop: "3px solid",
  transition: "transform .1s ease-out"
})), AddonButton = styled56(TabButton)(({ active, theme, preActive }) => `
    color: ${preActive || active ? theme.barSelectedColor : theme.barTextColor};
    .addon-collapsible-icon {
      color: ${preActive || active ? theme.barSelectedColor : theme.barTextColor};
    }
    &:hover {
      color: ${theme.barHoverColor};
      .addon-collapsible-icon {
        color: ${theme.barHoverColor};
      }
    }
  `);
function useList(list) {
  deprecate11("The `useList` tabs hook is deprecated. Use `TabsView` instead.");
  let tabBarRef = useRef8(), addonsRef = useRef8(), tabRefs = useRef8(/* @__PURE__ */ new Map()), { width: tabBarWidth = 1 } = useResizeObserver({
    // @ts-expect-error (non strict)
    ref: tabBarRef
  }), [visibleList, setVisibleList] = useState13(list), [invisibleList, setInvisibleList] = useState13([]), previousList = useRef8(list), AddonTab = useCallback11(
    ({
      menuName,
      actions
    }) => {
      let isAddonsActive = invisibleList.some(({ active }) => active), [isTooltipVisible, setTooltipVisible] = useState13(!1);
      return React48.createElement(React48.Fragment, null, React48.createElement(
        PopoverProvider,
        {
          visible: isTooltipVisible,
          onVisibleChange: setTooltipVisible,
          placement: "bottom",
          popover: React48.createElement(
            TooltipLinkList,
            {
              links: invisibleList.map(({ title, id, color: color4, active }) => ({
                id,
                title,
                color: color4,
                active,
                onClick: (e) => {
                  e.preventDefault(), actions.onSelect(id);
                }
              }))
            }
          )
        },
        React48.createElement(
          AddonButton,
          {
            id: "addons-menu-button",
            ref: addonsRef,
            active: isAddonsActive,
            preActive: isTooltipVisible,
            style: { visibility: invisibleList.length ? "visible" : "hidden" },
            "aria-hidden": !invisibleList.length,
            className: "tabbutton",
            type: "button",
            role: "tab"
          },
          menuName,
          React48.createElement(
            CollapseIcon,
            {
              className: "addon-collapsible-icon",
              isActive: isAddonsActive || isTooltipVisible
            }
          )
        )
      ), invisibleList.map(({ title, id, color: color4 }, index3) => {
        let indexId = `index-${index3}`;
        return React48.createElement(
          TabButton,
          {
            id: `tabbutton-${sanitize(id) ?? indexId}`,
            style: { visibility: "hidden" },
            "aria-hidden": !0,
            tabIndex: -1,
            ref: (ref) => {
              tabRefs.current.set(id, ref);
            },
            className: "tabbutton",
            type: "button",
            key: id,
            textColor: color4,
            role: "tab"
          },
          title
        );
      }));
    },
    [invisibleList]
  ), setTabLists = useCallback11(() => {
    if (!tabBarRef.current || !addonsRef.current)
      return;
    let { x, width } = tabBarRef.current.getBoundingClientRect(), { width: widthAddonsTab } = addonsRef.current.getBoundingClientRect(), rightBorder = invisibleList.length ? x + width - widthAddonsTab : x + width, newVisibleList = [], widthSum = 0, newInvisibleList = list.filter((item) => {
      let { id } = item, tabButton = tabRefs.current.get(id), { width: tabWidth = 0 } = tabButton?.getBoundingClientRect() || {}, crossBorder = x + widthSum + tabWidth > rightBorder;
      return (!crossBorder || !tabButton) && newVisibleList.push(item), widthSum += tabWidth, crossBorder;
    });
    (newVisibleList.length !== visibleList.length || previousList.current !== list) && (setVisibleList(newVisibleList), setInvisibleList(newInvisibleList), previousList.current = list);
  }, [invisibleList.length, list, visibleList]);
  return useLayoutEffect3(setTabLists, [setTabLists, tabBarWidth]), {
    tabRefs,
    addonsRef,
    tabBarRef,
    visibleList,
    invisibleList,
    AddonTab
  };
}

// src/components/components/Tabs/Tabs.tsx
var ignoreSsrWarning2 = "/* emotion-disable-server-rendering-unsafe-selector-warning-please-do-not-use-this-the-warning-exists-for-a-reason */", Wrapper4 = styled57.div(
  ({ theme, bordered }) => bordered ? {
    backgroundClip: "padding-box",
    border: `1px solid ${theme.appBorderColor}`,
    borderRadius: theme.appBorderRadius,
    overflow: "hidden",
    boxSizing: "border-box"
  } : {},
  ({ absolute }) => absolute ? {
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column"
  } : {
    display: "block"
  }
), StyledTabBar = styled57.div({
  overflow: "hidden",
  "&:first-of-type": {
    marginLeft: -3
  },
  whiteSpace: "nowrap",
  flexGrow: 1
}), TabBar = forwardRef17(
  (props, ref) => (deprecate12("The `TabBar` component is deprecated. Use `TabsView` instead."), React49.createElement(StyledTabBar, { "data-deprecated": "TabBar", ...props, ref }))
);
TabBar.displayName = "TabBar";
var Content3 = styled57.div(
  {
    display: "block",
    position: "relative",
    container: "tab-content / inline-size"
  },
  ({ theme }) => ({
    fontSize: theme.typography.size.s2 - 1,
    background: theme.background.content
  }),
  ({ bordered, theme }) => bordered ? {
    borderRadius: `0 0 ${theme.appBorderRadius - 1}px ${theme.appBorderRadius - 1}px`
  } : {},
  ({ absolute, bordered }) => absolute ? {
    height: `calc(100% - ${bordered ? 42 : 40}px)`,
    position: "absolute",
    left: 0 + (bordered ? 1 : 0),
    right: 0 + (bordered ? 1 : 0),
    bottom: 0 + (bordered ? 1 : 0),
    top: 40 + (bordered ? 1 : 0),
    overflow: "auto",
    [`& > *:first-child${ignoreSsrWarning2}`]: {
      position: "absolute",
      left: 0 + (bordered ? 1 : 0),
      right: 0 + (bordered ? 1 : 0),
      bottom: 0 + (bordered ? 1 : 0),
      top: 0 + (bordered ? 1 : 0),
      height: `calc(100% - ${bordered ? 2 : 0}px)`,
      overflow: "auto"
    }
  } : {}
), TabWrapper = forwardRef17(
  ({ active, render, children }, ref) => (deprecate12("The `TabWrapper` component is deprecated. Use `TabsView` instead."), React49.createElement(VisuallyHidden, { "data-deprecated": "TabWrapper", ref, active }, render ? render() : children))
);
TabWrapper.displayName = "TabWrapper";
var TabErrorBoundary = class extends Component2 {
  constructor(props) {
    super(props), this.state = { hasError: !1 };
  }
  static getDerivedStateFromError() {
    return { hasError: !0 };
  }
  componentDidCatch(error, info) {
    console.error("Error rendering addon panel"), console.error(error), console.error(info.componentStack);
  }
  render() {
    return this.state.hasError && this.props.active ? React49.createElement(
      EmptyTabContent,
      {
        title: "This addon has errors",
        description: "Check your browser logs and addon code to pinpoint what went wrong. This issue was not caused by Storybook."
      }
    ) : this.props.children;
  }
}, Tabs = memo(
  ({
    children,
    selected = null,
    actions,
    absolute = !1,
    bordered = !1,
    tools = null,
    backgroundColor,
    id: htmlId = null,
    menuName = "Tabs",
    emptyState,
    showToolsWhenEmpty
  }) => {
    deprecate12("The `Tabs` component is deprecated. Use `TabsView` instead.");
    let list = useMemo5(
      () => childrenToList(children).map((i, index3) => ({
        ...i,
        active: selected ? i.id === selected : index3 === 0
      })),
      [children, selected]
    ), { visibleList, tabBarRef, tabRefs, AddonTab } = useList(list), EmptyContent = emptyState ?? React49.createElement(EmptyTabContent, { title: "Nothing found" });
    return !showToolsWhenEmpty && list.length === 0 ? EmptyContent : (
      // @ts-expect-error (non strict)
      React49.createElement(Wrapper4, { "data-deprecated": "Tabs", absolute, bordered, id: htmlId }, React49.createElement(FlexBar, { scrollable: !1, border: !0, backgroundColor }, React49.createElement(TabBar, { style: { whiteSpace: "normal" }, ref: tabBarRef, role: "tablist" }, visibleList.map(({ title, id, active, color: color4 }, index3) => {
        let indexId = `index-${index3}`;
        return React49.createElement(
          TabButton,
          {
            id: `tabbutton-${sanitize2(id) ?? indexId}`,
            ref: (ref) => {
              tabRefs.current.set(id, ref);
            },
            className: `tabbutton ${active ? "tabbutton-active" : ""}`,
            type: "button",
            key: id,
            active,
            textColor: color4,
            onClick: (e) => {
              e.preventDefault(), actions.onSelect(id);
            },
            role: "tab",
            "aria-selected": active
          },
          typeof title == "function" ? React49.createElement("title", null) : title
        );
      }), React49.createElement(AddonTab, { menuName, actions })), tools), React49.createElement(Content3, { id: "panel-tab-content", bordered, absolute }, list.length ? list.map(({ id, active, render }) => React49.createElement(TabErrorBoundary, { key: id, active }, React49.createElement(render, { active }, null))) : EmptyContent))
    );
  }
);
Tabs.displayName = "Tabs";
var TabsState = class extends Component2 {
  constructor(props) {
    super(props);
    this.handlers = {
      onSelect: (id) => this.setState({ selected: id })
    };
    deprecate12("The `TabsState` class is deprecated. Use `TabsView` instead."), this.state = {
      selected: props.initial
    };
  }
  render() {
    let { bordered = !1, absolute = !1, children, backgroundColor, menuName } = this.props, { selected } = this.state;
    return React49.createElement(
      Tabs,
      {
        bordered,
        absolute,
        selected,
        backgroundColor,
        menuName,
        actions: this.handlers
      },
      children
    );
  }
};
TabsState.defaultProps = {
  children: [],
  // @ts-expect-error (non strict)
  initial: null,
  absolute: !1,
  bordered: !1,
  backgroundColor: "",
  // @ts-expect-error (non strict)
  menuName: void 0
};

// src/components/components/Bar/Separator.tsx
import React50, { Fragment as Fragment5 } from "react";
import { styled as styled58 } from "storybook/theming";
var Separator2 = styled58.span(
  ({ theme }) => ({
    width: 1,
    height: 20,
    background: theme.appBorderColor,
    marginLeft: 2,
    marginRight: 2
  }),
  ({ force }) => force ? {} : {
    "& + &": {
      display: "none"
    }
  }
);
Separator2.displayName = "Separator";
var interleaveSeparators = (list) => list.reduce(
  (acc, item, index3) => item ? React50.createElement(Fragment5, { key: item.id || item.key || `f-${index3}` }, acc, index3 > 0 ? React50.createElement(Separator2, { key: `s-${index3}` }) : null, item.render() || item) : acc,
  null
);

// src/components/components/addon-panel/addon-panel.tsx
import React51, { useEffect as useEffect8, useRef as useRef9 } from "react";
import { styled as styled59 } from "storybook/theming";
var usePrevious = (value) => {
  let ref = useRef9();
  return useEffect8(() => {
    ref.current = value;
  }, [value]), ref.current;
}, useUpdate = (update, value) => {
  let previousValue = usePrevious(value);
  return update ? value : previousValue;
}, Div2 = styled59.div(({ theme }) => ({
  fontSize: theme.typography.size.s2 - 1,
  height: "100%"
})), AddonPanel = ({ active, children, hasScrollbar = !0 }) => (
  // the hidden attribute is an valid html element that's both accessible and works to visually hide content
  React51.createElement(Div2, { hidden: !active }, hasScrollbar ? React51.createElement(ScrollArea, { vertical: !0 }, useUpdate(active, children)) : useUpdate(active, children))
);

// src/components/components/Toolbar/Toolbar.tsx
import React52, { useRef as useRef10 } from "react";

// ../node_modules/@react-aria/toolbar/dist/useToolbar.mjs
import { useState as $k3LOe$useState2, useRef as $k3LOe$useRef2 } from "react";
function $2680b1829e803644$export$fa142eb1681c5202(props, ref) {
  let { "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, orientation = "horizontal" } = props, [isInToolbar, setInToolbar] = $k3LOe$useState2(!1);
  $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => {
    var _ref_current_parentElement;
    setInToolbar(!!(ref.current && (!((_ref_current_parentElement = ref.current.parentElement) === null || _ref_current_parentElement === void 0) && _ref_current_parentElement.closest('[role="toolbar"]'))));
  });
  let { direction } = $18f2051aff69b9bf$export$43bb16f9c6d9e3f7(), shouldReverse = direction === "rtl" && orientation === "horizontal", focusManager = $9bf71ea28793e738$export$c5251b9e124bf29(ref), onKeyDown = (e) => {
    if (e.currentTarget.contains(e.target)) {
      if (orientation === "horizontal" && e.key === "ArrowRight" || orientation === "vertical" && e.key === "ArrowDown")
        shouldReverse ? focusManager.focusPrevious() : focusManager.focusNext();
      else if (orientation === "horizontal" && e.key === "ArrowLeft" || orientation === "vertical" && e.key === "ArrowUp")
        shouldReverse ? focusManager.focusNext() : focusManager.focusPrevious();
      else if (e.key === "Tab") {
        e.stopPropagation(), lastFocused.current = document.activeElement, e.shiftKey ? focusManager.focusFirst() : focusManager.focusLast();
        return;
      } else
        return;
      e.stopPropagation(), e.preventDefault();
    }
  }, lastFocused = $k3LOe$useRef2(null), onBlur = (e) => {
    !e.currentTarget.contains(e.relatedTarget) && !lastFocused.current && (lastFocused.current = e.target);
  }, onFocus = (e) => {
    var _ref_current;
    if (lastFocused.current && !e.currentTarget.contains(e.relatedTarget) && (!((_ref_current = ref.current) === null || _ref_current === void 0) && _ref_current.contains(e.target))) {
      var _lastFocused_current;
      (_lastFocused_current = lastFocused.current) === null || _lastFocused_current === void 0 || _lastFocused_current.focus(), lastFocused.current = null;
    }
  };
  return {
    toolbarProps: {
      ...$65484d02dcb7eb3e$export$457c3d6518dd4c6f(props, {
        labelable: !0
      }),
      role: isInToolbar ? "group" : "toolbar",
      "aria-orientation": orientation,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabel == null ? ariaLabelledBy : void 0,
      onKeyDownCapture: isInToolbar ? void 0 : onKeyDown,
      onFocusCapture: isInToolbar ? void 0 : onFocus,
      onBlurCapture: isInToolbar ? void 0 : onBlur
    }
  };
}

// src/components/components/Toolbar/Toolbar.tsx
var AbstractToolbar = ({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  ...rest
}) => {
  let ref = useRef10(null), { toolbarProps } = $2680b1829e803644$export$fa142eb1681c5202(
    {
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledby,
      orientation: "horizontal"
    },
    ref
  );
  return React52.createElement("div", { ref, ...toolbarProps, ...rest });
}, Toolbar = ({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  ...rest
}) => {
  let ref = useRef10(null), { toolbarProps } = $2680b1829e803644$export$fa142eb1681c5202(
    {
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledby,
      orientation: "horizontal"
    },
    ref
  );
  return React52.createElement(Bar, { ref, ...toolbarProps, ...rest });
};

// src/components/components/Tabs/TabList.tsx
import React53, { useCallback as useCallback12, useEffect as useEffect9, useRef as useRef11, useState as useState14 } from "react";
import { ChevronSmallLeftIcon, ChevronSmallRightIcon } from "@storybook/icons";

// ../node_modules/@react-aria/tabs/dist/utils.mjs
var $99b62ae3ff97ec45$export$c5f62239608282b6 = /* @__PURE__ */ new WeakMap();
function $99b62ae3ff97ec45$export$567fc7097e064344(state, key, role) {
  if (!state)
    return "";
  typeof key == "string" && (key = key.replace(/\s+/g, ""));
  let baseId = $99b62ae3ff97ec45$export$c5f62239608282b6.get(state);
  return process.env.NODE_ENV !== "production" && !baseId && console.error("There is no tab id, please check if you have rendered the tab panel before the tab list."), `${baseId}-${role}-${key}`;
}

// ../node_modules/@react-aria/tabs/dist/useTab.mjs
function $0175d55c2a017ebc$export$fdf4756d5b8ef90a(props, state, ref) {
  let { key, isDisabled: propsDisabled, shouldSelectOnPressUp } = props, { selectionManager: manager, selectedKey } = state, isSelected = key === selectedKey, isDisabled = propsDisabled || state.isDisabled || state.selectionManager.isDisabled(key), { itemProps, isPressed } = $880e95eb8b93ba9a$export$ecf600387e221c37({
    selectionManager: manager,
    key,
    ref,
    isDisabled,
    shouldSelectOnPressUp,
    linkBehavior: "selection"
  }), tabId = $99b62ae3ff97ec45$export$567fc7097e064344(state, key, "tab"), tabPanelId = $99b62ae3ff97ec45$export$567fc7097e064344(state, key, "tabpanel"), { tabIndex } = itemProps, item = state.collection.getItem(key), domProps = $65484d02dcb7eb3e$export$457c3d6518dd4c6f(item?.props, {
    labelable: !0
  });
  delete domProps.id;
  let linkProps = $ea8dcbcb9ea1b556$export$7e924b3091a3bd18(item?.props), { focusableProps } = $f645667febf57a63$export$4c014de7c8940b4c({
    isDisabled
  }, ref);
  return {
    tabProps: $3ef42575df84b30b$export$9d1611c77c2fe928(domProps, focusableProps, linkProps, itemProps, {
      id: tabId,
      "aria-selected": isSelected,
      "aria-disabled": isDisabled || void 0,
      "aria-controls": isSelected ? tabPanelId : void 0,
      tabIndex: isDisabled ? void 0 : tabIndex,
      role: "tab"
    }),
    isSelected,
    isDisabled,
    isPressed
  };
}

// ../node_modules/@react-aria/tabs/dist/useTabPanel.mjs
function $34bce698202e07cb$export$fae0121b5afe572d(props, state, ref) {
  let tabIndex = $83013635b024ae3d$export$eac1895992b9f3d6(ref) ? void 0 : 0;
  var _props_id;
  let id = $99b62ae3ff97ec45$export$567fc7097e064344(state, (_props_id = props.id) !== null && _props_id !== void 0 ? _props_id : state?.selectedKey, "tabpanel"), tabPanelProps = $313b98861ee5dd6c$export$d6875122194c7b44({
    ...props,
    id,
    "aria-labelledby": $99b62ae3ff97ec45$export$567fc7097e064344(state, state?.selectedKey, "tab")
  });
  return {
    tabPanelProps: $3ef42575df84b30b$export$9d1611c77c2fe928(tabPanelProps, {
      tabIndex,
      role: "tabpanel",
      "aria-describedby": props["aria-describedby"],
      "aria-details": props["aria-details"]
    })
  };
}

// ../node_modules/@react-aria/tabs/dist/TabsKeyboardDelegate.mjs
var $bfc6f2d60b8a4c40$export$15010ca3c1abe90b = class {
  getKeyLeftOf(key) {
    return this.flipDirection ? this.getNextKey(key) : this.getPreviousKey(key);
  }
  getKeyRightOf(key) {
    return this.flipDirection ? this.getPreviousKey(key) : this.getNextKey(key);
  }
  isDisabled(key) {
    var _this_collection_getItem_props, _this_collection_getItem;
    return this.disabledKeys.has(key) || !!(!((_this_collection_getItem = this.collection.getItem(key)) === null || _this_collection_getItem === void 0 || (_this_collection_getItem_props = _this_collection_getItem.props) === null || _this_collection_getItem_props === void 0) && _this_collection_getItem_props.isDisabled);
  }
  getFirstKey() {
    let key = this.collection.getFirstKey();
    return key != null && this.isDisabled(key) && (key = this.getNextKey(key)), key;
  }
  getLastKey() {
    let key = this.collection.getLastKey();
    return key != null && this.isDisabled(key) && (key = this.getPreviousKey(key)), key;
  }
  getKeyAbove(key) {
    return this.tabDirection ? null : this.getPreviousKey(key);
  }
  getKeyBelow(key) {
    return this.tabDirection ? null : this.getNextKey(key);
  }
  getNextKey(startKey) {
    let key = startKey;
    do
      key = this.collection.getKeyAfter(key), key == null && (key = this.collection.getFirstKey());
    while (key != null && this.isDisabled(key));
    return key;
  }
  getPreviousKey(startKey) {
    let key = startKey;
    do
      key = this.collection.getKeyBefore(key), key == null && (key = this.collection.getLastKey());
    while (key != null && this.isDisabled(key));
    return key;
  }
  constructor(collection, direction, orientation, disabledKeys = /* @__PURE__ */ new Set()) {
    this.collection = collection, this.flipDirection = direction === "rtl" && orientation === "horizontal", this.disabledKeys = disabledKeys, this.tabDirection = orientation === "horizontal";
  }
};

// ../node_modules/@react-aria/tabs/dist/useTabList.mjs
import { useMemo as $bQNZs$useMemo } from "react";
function $58d314389b21fa3f$export$773e389e644c5874(props, state, ref) {
  let { orientation = "horizontal", keyboardActivation = "automatic" } = props, { collection, selectionManager: manager, disabledKeys } = state, { direction } = $18f2051aff69b9bf$export$43bb16f9c6d9e3f7(), delegate = $bQNZs$useMemo(() => new $bfc6f2d60b8a4c40$export$15010ca3c1abe90b(collection, direction, orientation, disabledKeys), [
    collection,
    disabledKeys,
    orientation,
    direction
  ]), { collectionProps } = $ae20dd8cbca75726$export$d6daf82dcd84e87c({
    ref,
    selectionManager: manager,
    keyboardDelegate: delegate,
    selectOnFocus: keyboardActivation === "automatic",
    disallowEmptySelection: !0,
    scrollRef: ref,
    linkBehavior: "selection"
  }), tabsId = $bdb11010cef70236$export$f680877a34711e37();
  $99b62ae3ff97ec45$export$c5f62239608282b6.set(state, tabsId);
  let tabListLabelProps = $313b98861ee5dd6c$export$d6875122194c7b44({
    ...props,
    id: tabsId
  });
  return {
    tabListProps: {
      ...$3ef42575df84b30b$export$9d1611c77c2fe928(collectionProps, tabListLabelProps),
      role: "tablist",
      "aria-orientation": orientation,
      tabIndex: void 0
    }
  };
}

// src/components/components/Tabs/TabList.tsx
import { styled as styled60 } from "storybook/theming";
var StyledTabButton2 = styled60.button(
  {
    whiteSpace: "normal",
    display: "inline-flex",
    overflow: "hidden",
    verticalAlign: "top",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    textDecoration: "none",
    scrollSnapAlign: "start",
    "&:empty": {
      display: "none"
    },
    "&[hidden]": {
      display: "none"
    }
  },
  ({ theme }) => ({
    padding: "0 15px",
    transition: "color 0.2s linear, border-bottom-color 0.2s linear",
    height: 40,
    lineHeight: "12px",
    cursor: "pointer",
    background: "transparent",
    border: "0 solid transparent",
    borderTop: "3px solid transparent",
    borderBottom: "3px solid transparent",
    fontWeight: "bold",
    fontSize: 13,
    "&:focus-visible": {
      outline: "0 none",
      boxShadow: `inset 0 0 0 2px ${theme.barSelectedColor}`
    }
  }),
  ({ isSelected, theme }) => isSelected ? {
    color: theme.barSelectedColor,
    borderBottomColor: theme.barSelectedColor
  } : {
    color: theme.barTextColor,
    borderBottomColor: "transparent",
    "&:hover": {
      color: theme.barHoverColor
    }
  }
), TabListContainer = styled60.div({
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
  position: "relative",
  overflow: "hidden"
}), ScrollContainer = styled60.div({
  display: "flex",
  overflowX: "auto",
  scrollbarWidth: "none",
  msOverflowStyle: "none",
  WebkitScrollbar: "none",
  scrollSnapType: "x mandatory",
  flex: 1,
  "&::-webkit-scrollbar": {
    display: "none"
  }
}), StyledTabList = styled60.div({
  display: "flex",
  flexShrink: 0
}), SCROLL_BUTTON_WIDTH = 28, ScrollButtonContainer = styled60.div(({ $showStartBorder, $showEndBorder, theme }) => ({
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 6,
  boxShadow: $showStartBorder ? `inset 1px 0 0 ${theme.appBorderColor}` : $showEndBorder ? `inset -1px 0 0 ${theme.appBorderColor}` : "none"
})), ScrollButton = styled60(Button)({
  flexShrink: 0,
  paddingInline: 0,
  width: 16
}), TabButton2 = ({ item, state }) => {
  let { rendered } = item, tabRef = React53.useRef(null), typedState = state, { tabProps, isDisabled, isPressed, isSelected } = $0175d55c2a017ebc$export$fdf4756d5b8ef90a(item, typedState, tabRef);
  return React53.createElement(
    StyledTabButton2,
    {
      ...tabProps,
      isDisabled,
      isPressed,
      isSelected,
      className: `tabbutton ${isSelected ? "tabbutton-active" : ""}`,
      ref: tabRef
    },
    rendered
  );
}, TabList = ({ state, ...rest }) => {
  let containerRef = useRef11(null), scrollContainerRef = useRef11(null), tabListRef = useRef11(null), { tabListProps } = $58d314389b21fa3f$export$773e389e644c5874(
    { orientation: "horizontal" },
    state,
    tabListRef
  ), [showScrollButtons, setShowScrollButtons] = useState14(!1), [canScrollLeft, setCanScrollLeft] = useState14(!1), [canScrollRight, setCanScrollRight] = useState14(!1), updateScrollState = useCallback12(() => {
    let scrollContainer = scrollContainerRef.current, container = containerRef.current;
    if (!scrollContainer || !container)
      return;
    let { scrollLeft, scrollWidth, clientWidth } = scrollContainer, availableWidth = container.clientWidth - (showScrollButtons ? SCROLL_BUTTON_WIDTH * 2 : 0), needsScrolling = scrollWidth > availableWidth;
    setShowScrollButtons(needsScrolling), needsScrolling ? (setCanScrollLeft(scrollLeft > 0), setCanScrollRight(scrollLeft < scrollWidth - clientWidth)) : (setCanScrollLeft(!1), setCanScrollRight(!1));
  }, [showScrollButtons]), throttledUpdateScrollState = useCallback12(() => {
    updateScrollState();
  }, [updateScrollState]);
  useEffect9(() => {
    let scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || typeof window > "u")
      return;
    scrollContainer.addEventListener("scroll", throttledUpdateScrollState, { passive: !0 });
    let resizeObserver = null;
    typeof ResizeObserver < "u" && (resizeObserver = new ResizeObserver(throttledUpdateScrollState), resizeObserver.observe(scrollContainer));
    let timeoutId = setTimeout(throttledUpdateScrollState, 0);
    return () => {
      clearTimeout(timeoutId), scrollContainer.removeEventListener("scroll", throttledUpdateScrollState), resizeObserver && resizeObserver.disconnect();
    };
  }, [throttledUpdateScrollState]);
  let scroll = useCallback12((direction) => {
    let scrollContainer = scrollContainerRef.current, container = containerRef.current;
    if (!scrollContainer || !container || typeof window > "u")
      return;
    let availableWidth = container.clientWidth - SCROLL_BUTTON_WIDTH * 2, scrollDistance = direction === "backward" ? -availableWidth : availableWidth;
    typeof scrollContainer.scrollBy == "function" ? scrollContainer.scrollBy({ left: scrollDistance, behavior: "smooth" }) : scrollContainer.scrollLeft += scrollDistance;
  }, []), scrollBackward = useCallback12(() => scroll("backward"), [scroll]), scrollForward = useCallback12(() => scroll("forward"), [scroll]);
  return React53.createElement(TabListContainer, { ...rest, ref: containerRef, "data-show-scroll-buttons": showScrollButtons }, showScrollButtons && React53.createElement(ScrollButtonContainer, { $showEndBorder: canScrollLeft }, React53.createElement(
    ScrollButton,
    {
      variant: "ghost",
      padding: "small",
      size: "small",
      ariaLabel: "Scroll backward",
      disabled: !canScrollLeft,
      onClick: scrollBackward,
      tabIndex: -1
    },
    React53.createElement(ChevronSmallLeftIcon, null)
  )), React53.createElement(ScrollContainer, { ref: scrollContainerRef }, React53.createElement(StyledTabList, { ref: tabListRef, ...tabListProps }, [...state.collection].map((item) => React53.createElement(TabButton2, { key: item.key, item, state })))), showScrollButtons && React53.createElement(ScrollButtonContainer, { $showStartBorder: canScrollRight }, React53.createElement(
    ScrollButton,
    {
      variant: "ghost",
      padding: "small",
      size: "small",
      ariaLabel: "Scroll forward",
      disabled: !canScrollRight,
      onClick: scrollForward,
      tabIndex: -1
    },
    React53.createElement(ChevronSmallRightIcon, null)
  )));
};

// src/components/components/Tabs/TabPanel.tsx
import React54, { useRef as useRef12 } from "react";
import { styled as styled61 } from "storybook/theming";
var Panel = styled61.div({
  overflowY: "hidden",
  height: "100%"
}), TabPanel = ({
  hasScrollbar = !0,
  renderAllChildren = !1,
  state
}) => {
  let ref = useRef12(null), typedState = state, { tabPanelProps } = $34bce698202e07cb$export$fae0121b5afe572d(typedState.selectedItem ?? {}, typedState, ref);
  return (renderAllChildren ? [...typedState.collection] : [typedState.selectedItem]).filter((item) => !!item).map((item) => {
    let isSelected = typedState.selectedKey === item.key;
    return React54.createElement(
      Panel,
      {
        key: item.key,
        ref: isSelected ? ref : void 0,
        ...isSelected ? tabPanelProps : {},
        id: isSelected ? `${tabPanelProps.id}`.replace(/null$/, `${item.key}`) : void 0,
        hidden: isSelected ? void 0 : !0
      },
      hasScrollbar ? React54.createElement(ScrollArea, { vertical: !0 }, item.props.children) : item.props.children
    );
  });
};

// src/components/components/Tabs/TabsView.tsx
import React55 from "react";

// ../node_modules/@react-stately/list/dist/ListCollection.mjs
var $a02d57049d202695$export$d085fb9e920b5ca7 = class {
  *[Symbol.iterator]() {
    yield* this.iterable;
  }
  get size() {
    return this._size;
  }
  getKeys() {
    return this.keyMap.keys();
  }
  getKeyBefore(key) {
    let node = this.keyMap.get(key);
    var _node_prevKey;
    return node && (_node_prevKey = node.prevKey) !== null && _node_prevKey !== void 0 ? _node_prevKey : null;
  }
  getKeyAfter(key) {
    let node = this.keyMap.get(key);
    var _node_nextKey;
    return node && (_node_nextKey = node.nextKey) !== null && _node_nextKey !== void 0 ? _node_nextKey : null;
  }
  getFirstKey() {
    return this.firstKey;
  }
  getLastKey() {
    return this.lastKey;
  }
  getItem(key) {
    var _this_keyMap_get;
    return (_this_keyMap_get = this.keyMap.get(key)) !== null && _this_keyMap_get !== void 0 ? _this_keyMap_get : null;
  }
  at(idx) {
    let keys = [
      ...this.getKeys()
    ];
    return this.getItem(keys[idx]);
  }
  getChildren(key) {
    let node = this.keyMap.get(key);
    return node?.childNodes || [];
  }
  constructor(nodes) {
    this.keyMap = /* @__PURE__ */ new Map(), this.firstKey = null, this.lastKey = null, this.iterable = nodes;
    let visit = (node) => {
      if (this.keyMap.set(node.key, node), node.childNodes && node.type === "section") for (let child of node.childNodes) visit(child);
    };
    for (let node of nodes) visit(node);
    let last = null, index3 = 0, size = 0;
    for (let [key, node] of this.keyMap)
      last ? (last.nextKey = key, node.prevKey = last.key) : (this.firstKey = key, node.prevKey = void 0), node.type === "item" && (node.index = index3++), (node.type === "section" || node.type === "item") && size++, last = node, last.nextKey = void 0;
    this._size = size;
    var _last_key;
    this.lastKey = (_last_key = last?.key) !== null && _last_key !== void 0 ? _last_key : null;
  }
};

// ../node_modules/@react-stately/list/dist/useListState.mjs
import { useMemo as $d5vlZ$useMemo, useCallback as $d5vlZ$useCallback, useRef as $d5vlZ$useRef, useEffect as $d5vlZ$useEffect } from "react";
function $e72dd72e1c76a225$export$2f645645f7bca764(props) {
  let { filter, layoutDelegate } = props, selectionState = $7af3f5b51489e0b5$export$253fe78d46329472(props), disabledKeys = $d5vlZ$useMemo(() => props.disabledKeys ? new Set(props.disabledKeys) : /* @__PURE__ */ new Set(), [
    props.disabledKeys
  ]), factory = $d5vlZ$useCallback((nodes) => filter ? new $a02d57049d202695$export$d085fb9e920b5ca7(filter(nodes)) : new $a02d57049d202695$export$d085fb9e920b5ca7(nodes), [
    filter
  ]), context = $d5vlZ$useMemo(() => ({
    suppressTextValueWarning: props.suppressTextValueWarning
  }), [
    props.suppressTextValueWarning
  ]), collection = $7613b1592d41b092$export$6cd28814d92fa9c9(props, factory, context), selectionManager = $d5vlZ$useMemo(() => new $d496c0a20b6e58ec$export$6c8a5aaad13c9852(collection, selectionState, {
    layoutDelegate
  }), [
    collection,
    selectionState,
    layoutDelegate
  ]);
  return $e72dd72e1c76a225$var$useFocusedKeyReset(collection, selectionManager), {
    collection,
    disabledKeys,
    selectionManager
  };
}
function $e72dd72e1c76a225$var$useFocusedKeyReset(collection, selectionManager) {
  let cachedCollection = $d5vlZ$useRef(null);
  $d5vlZ$useEffect(() => {
    if (selectionManager.focusedKey != null && !collection.getItem(selectionManager.focusedKey) && cachedCollection.current) {
      let startItem = cachedCollection.current.getItem(selectionManager.focusedKey), cachedItemNodes = [
        ...cachedCollection.current.getKeys()
      ].map((key) => {
        let itemNode = cachedCollection.current.getItem(key);
        return itemNode?.type === "item" ? itemNode : null;
      }).filter((node) => node !== null), itemNodes = [
        ...collection.getKeys()
      ].map((key) => {
        let itemNode = collection.getItem(key);
        return itemNode?.type === "item" ? itemNode : null;
      }).filter((node) => node !== null);
      var _cachedItemNodes_length, _itemNodes_length;
      let diff = ((_cachedItemNodes_length = cachedItemNodes?.length) !== null && _cachedItemNodes_length !== void 0 ? _cachedItemNodes_length : 0) - ((_itemNodes_length = itemNodes?.length) !== null && _itemNodes_length !== void 0 ? _itemNodes_length : 0);
      var _startItem_index, _startItem_index1, _itemNodes_length1;
      let index3 = Math.min(diff > 1 ? Math.max(((_startItem_index = startItem?.index) !== null && _startItem_index !== void 0 ? _startItem_index : 0) - diff + 1, 0) : (_startItem_index1 = startItem?.index) !== null && _startItem_index1 !== void 0 ? _startItem_index1 : 0, ((_itemNodes_length1 = itemNodes?.length) !== null && _itemNodes_length1 !== void 0 ? _itemNodes_length1 : 0) - 1), newNode = null, isReverseSearching = !1;
      for (; index3 >= 0; ) {
        if (!selectionManager.isDisabled(itemNodes[index3].key)) {
          newNode = itemNodes[index3];
          break;
        }
        if (index3 < itemNodes.length - 1 && !isReverseSearching) index3++;
        else {
          isReverseSearching = !0;
          var _startItem_index2, _startItem_index3;
          index3 > ((_startItem_index2 = startItem?.index) !== null && _startItem_index2 !== void 0 ? _startItem_index2 : 0) && (index3 = (_startItem_index3 = startItem?.index) !== null && _startItem_index3 !== void 0 ? _startItem_index3 : 0), index3--;
        }
      }
      selectionManager.setFocusedKey(newNode ? newNode.key : null);
    }
    cachedCollection.current = collection;
  }, [
    collection,
    selectionManager
  ]);
}

// ../node_modules/@react-stately/list/dist/useSingleSelectListState.mjs
import { useMemo as $eBozH$useMemo } from "react";
function $a0d645289fe9b86b$export$e7f05e985daf4b5f(props) {
  var _props_defaultSelectedKey;
  let [selectedKey, setSelectedKey] = $458b0a5536c1a7cf$export$40bfa8c7b0832715(props.selectedKey, (_props_defaultSelectedKey = props.defaultSelectedKey) !== null && _props_defaultSelectedKey !== void 0 ? _props_defaultSelectedKey : null, props.onSelectionChange), selectedKeys = $eBozH$useMemo(() => selectedKey != null ? [
    selectedKey
  ] : [], [
    selectedKey
  ]), { collection, disabledKeys, selectionManager } = $e72dd72e1c76a225$export$2f645645f7bca764({
    ...props,
    selectionMode: "single",
    disallowEmptySelection: !0,
    allowDuplicateSelectionEvents: !0,
    selectedKeys,
    onSelectionChange: (keys) => {
      if (keys === "all") return;
      var _keys_values_next_value;
      let key = (_keys_values_next_value = keys.values().next().value) !== null && _keys_values_next_value !== void 0 ? _keys_values_next_value : null;
      key === selectedKey && props.onSelectionChange && props.onSelectionChange(key), setSelectedKey(key);
    }
  }), selectedItem = selectedKey != null ? collection.getItem(selectedKey) : null;
  return {
    collection,
    disabledKeys,
    selectionManager,
    selectedKey,
    setSelectedKey,
    selectedItem
  };
}

// ../node_modules/@react-stately/tabs/dist/useTabListState.mjs
import { useRef as $fgY1A$useRef, useEffect as $fgY1A$useEffect } from "react";
function $76f919a04c5a7d14$export$4ba071daf4e486(props) {
  var _props_defaultSelectedKey, _ref;
  let state = $a0d645289fe9b86b$export$e7f05e985daf4b5f({
    ...props,
    onSelectionChange: props.onSelectionChange ? (key) => {
      var _props_onSelectionChange;
      key != null && ((_props_onSelectionChange = props.onSelectionChange) === null || _props_onSelectionChange === void 0 || _props_onSelectionChange.call(props, key));
    } : void 0,
    suppressTextValueWarning: !0,
    defaultSelectedKey: (_ref = (_props_defaultSelectedKey = props.defaultSelectedKey) !== null && _props_defaultSelectedKey !== void 0 ? _props_defaultSelectedKey : $76f919a04c5a7d14$var$findDefaultSelectedKey(props.collection, props.disabledKeys ? new Set(props.disabledKeys) : /* @__PURE__ */ new Set())) !== null && _ref !== void 0 ? _ref : void 0
  }), { selectionManager, collection, selectedKey: currentSelectedKey } = state, lastSelectedKey = $fgY1A$useRef(currentSelectedKey);
  return $fgY1A$useEffect(() => {
    let selectedKey = currentSelectedKey;
    props.selectedKey == null && (selectionManager.isEmpty || selectedKey == null || !collection.getItem(selectedKey)) && (selectedKey = $76f919a04c5a7d14$var$findDefaultSelectedKey(collection, state.disabledKeys), selectedKey != null && selectionManager.setSelectedKeys([
      selectedKey
    ])), (selectedKey != null && selectionManager.focusedKey == null || !selectionManager.isFocused && selectedKey !== lastSelectedKey.current) && selectionManager.setFocusedKey(selectedKey), lastSelectedKey.current = selectedKey;
  }), {
    ...state,
    isDisabled: props.isDisabled || !1
  };
}
function $76f919a04c5a7d14$var$findDefaultSelectedKey(collection, disabledKeys) {
  let selectedKey = null;
  if (collection) {
    var _collection_getItem_props, _collection_getItem, _collection_getItem_props1, _collection_getItem1;
    for (selectedKey = collection.getFirstKey(); selectedKey != null && (disabledKeys.has(selectedKey) || !((_collection_getItem = collection.getItem(selectedKey)) === null || _collection_getItem === void 0 || (_collection_getItem_props = _collection_getItem.props) === null || _collection_getItem_props === void 0) && _collection_getItem_props.isDisabled) && selectedKey !== collection.getLastKey(); ) selectedKey = collection.getKeyAfter(selectedKey);
    selectedKey != null && (disabledKeys.has(selectedKey) || !((_collection_getItem1 = collection.getItem(selectedKey)) === null || _collection_getItem1 === void 0 || (_collection_getItem_props1 = _collection_getItem1.props) === null || _collection_getItem_props1 === void 0) && _collection_getItem_props1.isDisabled) && selectedKey === collection.getLastKey() && (selectedKey = collection.getFirstKey());
  }
  return selectedKey;
}

// src/components/components/Tabs/TabsView.tsx
import { styled as styled62 } from "storybook/theming";
var useTabsState = ({
  defaultSelected,
  onSelectionChange,
  selected,
  tabs
}) => $76f919a04c5a7d14$export$4ba071daf4e486({
  children: tabs.map(({ children: Children6, id, "aria-label": ariaLabel, title: Title7 }) => React55.createElement($c1d7fb2ec91bae71$export$6d08773d2e66f8f2, { key: id, "aria-label": ariaLabel, title: typeof Title7 == "function" ? React55.createElement(Title7, null) : Title7 }, typeof Children6 == "function" ? React55.createElement(Children6, null) : Children6)),
  disabledKeys: tabs.filter(({ isDisabled }) => isDisabled).map(({ id }) => id),
  defaultSelectedKey: defaultSelected,
  onSelectionChange: (key) => onSelectionChange?.(`${key}`),
  selectedKey: selected
}), Container4 = styled62.div({
  display: "flex",
  flexDirection: "column",
  height: "100%"
}), FlexTabPanel = styled62(TabPanel)(() => ({
  flex: 1
})), FlexTabList = styled62(TabList)(({ $simulatedGap }) => ({
  flex: "1 1 0%",
  '&[data-show-scroll-buttons="true"]': { marginInlineEnd: $simulatedGap }
})), TabsView = ({
  backgroundColor,
  barInnerStyle,
  defaultSelected,
  emptyState,
  onSelectionChange,
  panelProps = {},
  selected,
  showToolsWhenEmpty,
  tabs,
  tools,
  ...props
}) => {
  let state = useTabsState({
    defaultSelected,
    onSelectionChange,
    selected,
    tabs
  }), EmptyContent = emptyState ?? React55.createElement(EmptyTabContent, { title: "Nothing found" }), hasContent = tabs.length > 0;
  return !showToolsWhenEmpty && !hasContent ? EmptyContent : React55.createElement(Container4, { ...props }, React55.createElement(
    Bar,
    {
      scrollable: !1,
      border: !0,
      backgroundColor,
      innerStyle: {
        display: "flex",
        justifyContent: "space-between",
        paddingInlineStart: 0,
        paddingInlineEnd: 10,
        // A11y: the tools must be before the tab list in the DOM for correct tab order.
        // This lets us control order without adding a wrapper div, leading to better flex
        // behavior on tools for our callees (e.g. containerType: 'inline-size' in a11y-addon).
        "> *:not(:last-child)": {
          order: 2
        },
        "> *": {
          flexShrink: 0
        },
        ...barInnerStyle,
        gap: 0
      }
    },
    tools,
    hasContent ? React55.createElement(FlexTabList, { state, $simulatedGap: barInnerStyle?.gap ?? 6 }) : React55.createElement("div", null)
  ), hasContent ? React55.createElement(FlexTabPanel, { state, ...panelProps }) : EmptyContent);
};

// src/components/components/Tabs/StatelessTabList.tsx
import React56, { useCallback as useCallback13, useEffect as useEffect10, useRef as useRef13, useState as useState15 } from "react";
import { ChevronSmallLeftIcon as ChevronSmallLeftIcon2, ChevronSmallRightIcon as ChevronSmallRightIcon2 } from "@storybook/icons";

// ../node_modules/react-aria-components/dist/Tabs.mjs
import $7aSLZ$react, { createContext as $7aSLZ$createContext, forwardRef as $7aSLZ$forwardRef, useMemo as $7aSLZ$useMemo, useContext as $7aSLZ$useContext } from "react";
var $5e8ad37a45e1c704$export$cfa7aa87c26e7d1f = $7aSLZ$createContext(null), $5e8ad37a45e1c704$export$364712098d2aa57c = $7aSLZ$createContext(null), $5e8ad37a45e1c704$export$b2539bed5023c21c = $7aSLZ$forwardRef(function(props, ref) {
  [props, ref] = $64fa3d84918910a7$export$29f1550f4b0d4415(props, ref, $5e8ad37a45e1c704$export$cfa7aa87c26e7d1f);
  let { children, orientation = "horizontal" } = props;
  return children = $7aSLZ$useMemo(() => typeof children == "function" ? children({
    orientation,
    defaultChildren: null
  }) : children, [
    children,
    orientation
  ]), $7aSLZ$react.createElement($e1995378a142960e$export$bf788dd355e3a401, {
    content: children
  }, (collection) => $7aSLZ$react.createElement($5e8ad37a45e1c704$var$TabsInner, {
    props,
    collection,
    tabsRef: ref
  }));
});
function $5e8ad37a45e1c704$var$TabsInner({ props, tabsRef: ref, collection }) {
  let { orientation = "horizontal" } = props, state = $76f919a04c5a7d14$export$4ba071daf4e486({
    ...props,
    collection,
    children: void 0
  }), { focusProps, isFocused, isFocusVisible } = $f7dceffc5ad7768b$export$4e328f61c538687f({
    within: !0
  }), values = $7aSLZ$useMemo(() => ({
    orientation,
    isFocusWithin: isFocused,
    isFocusVisible
  }), [
    orientation,
    isFocused,
    isFocusVisible
  ]), renderProps = $64fa3d84918910a7$export$4d86445c2cf5e3({
    ...props,
    defaultClassName: "react-aria-Tabs",
    values
  }), DOMProps = $65484d02dcb7eb3e$export$457c3d6518dd4c6f(props, {
    global: !0
  });
  return $7aSLZ$react.createElement("div", {
    ...$3ef42575df84b30b$export$9d1611c77c2fe928(DOMProps, renderProps, focusProps),
    ref,
    slot: props.slot || void 0,
    "data-focused": isFocused || void 0,
    "data-orientation": orientation,
    "data-focus-visible": isFocusVisible || void 0,
    "data-disabled": state.isDisabled || void 0
  }, $7aSLZ$react.createElement($64fa3d84918910a7$export$2881499e37b75b9a, {
    values: [
      [
        $5e8ad37a45e1c704$export$cfa7aa87c26e7d1f,
        props
      ],
      [
        $5e8ad37a45e1c704$export$364712098d2aa57c,
        state
      ]
    ]
  }, renderProps.children));
}
var $5e8ad37a45e1c704$export$e51a686c67fdaa2d = $7aSLZ$forwardRef(function(props, ref) {
  return $7aSLZ$useContext($5e8ad37a45e1c704$export$364712098d2aa57c) ? $7aSLZ$react.createElement($5e8ad37a45e1c704$var$TabListInner, {
    props,
    forwardedRef: ref
  }) : $7aSLZ$react.createElement($e1995378a142960e$export$fb8073518f34e6ec, props);
});
function $5e8ad37a45e1c704$var$TabListInner({ props, forwardedRef: ref }) {
  let state = $7aSLZ$useContext($5e8ad37a45e1c704$export$364712098d2aa57c), { CollectionRoot } = $7aSLZ$useContext($7135fc7d473fd974$export$4feb769f8ddf26c5), { orientation = "horizontal", keyboardActivation = "automatic" } = $64fa3d84918910a7$export$fabf2dc03a41866e($5e8ad37a45e1c704$export$cfa7aa87c26e7d1f), objectRef = $df56164dff5785e2$export$4338b53315abf666(ref), { tabListProps } = $58d314389b21fa3f$export$773e389e644c5874({
    ...props,
    orientation,
    keyboardActivation
  }, state, objectRef), renderProps = $64fa3d84918910a7$export$4d86445c2cf5e3({
    ...props,
    children: null,
    defaultClassName: "react-aria-TabList",
    values: {
      orientation,
      state
    }
  }), DOMProps = $65484d02dcb7eb3e$export$457c3d6518dd4c6f(props, {
    global: !0
  });
  return delete DOMProps.id, $7aSLZ$react.createElement("div", {
    ...$3ef42575df84b30b$export$9d1611c77c2fe928(DOMProps, renderProps, tabListProps),
    ref: objectRef,
    "data-orientation": orientation || void 0
  }, $7aSLZ$react.createElement(CollectionRoot, {
    collection: state.collection,
    persistedKeys: $7135fc7d473fd974$export$90e00781bc59d8f9(state.selectionManager.focusedKey)
  }));
}
var $5e8ad37a45e1c704$var$TabItemNode = class extends $23b9f4fcf0fe224b$export$d68d59712b04d9d1 {
};
$5e8ad37a45e1c704$var$TabItemNode.type = "item";
var $5e8ad37a45e1c704$export$3e41faf802a29e71 = $e1995378a142960e$export$18af5c7a9e9b3664($5e8ad37a45e1c704$var$TabItemNode, (props, forwardedRef, item) => {
  let state = $7aSLZ$useContext($5e8ad37a45e1c704$export$364712098d2aa57c), ref = $df56164dff5785e2$export$4338b53315abf666(forwardedRef), { tabProps, isSelected, isDisabled, isPressed } = $0175d55c2a017ebc$export$fdf4756d5b8ef90a({
    key: item.key,
    ...props
  }, state, ref), { focusProps, isFocused, isFocusVisible } = $f7dceffc5ad7768b$export$4e328f61c538687f(), { hoverProps, isHovered } = $6179b936705e76d3$export$ae780daf29e6d456({
    isDisabled,
    onHoverStart: props.onHoverStart,
    onHoverEnd: props.onHoverEnd,
    onHoverChange: props.onHoverChange
  }), renderProps = $64fa3d84918910a7$export$4d86445c2cf5e3({
    ...props,
    id: void 0,
    children: item.rendered,
    defaultClassName: "react-aria-Tab",
    values: {
      isSelected,
      isDisabled,
      isFocused,
      isFocusVisible,
      isPressed,
      isHovered
    }
  }), ElementType = item.props.href ? "a" : "div", DOMProps = $65484d02dcb7eb3e$export$457c3d6518dd4c6f(props, {
    global: !0
  });
  return delete DOMProps.id, delete DOMProps.onClick, $7aSLZ$react.createElement(ElementType, {
    ...$3ef42575df84b30b$export$9d1611c77c2fe928(DOMProps, renderProps, tabProps, focusProps, hoverProps),
    ref,
    "data-selected": isSelected || void 0,
    "data-disabled": isDisabled || void 0,
    "data-focused": isFocused || void 0,
    "data-focus-visible": isFocusVisible || void 0,
    "data-pressed": isPressed || void 0,
    "data-hovered": isHovered || void 0
  }, renderProps.children);
}), $5e8ad37a45e1c704$export$3d96ec278d3efce4 = $f39a9eba43920ace$export$86427a43e3e48ebb(function(props, forwardedRef) {
  let state = $7aSLZ$useContext($5e8ad37a45e1c704$export$364712098d2aa57c), ref = $df56164dff5785e2$export$4338b53315abf666(forwardedRef), { id, ...otherProps } = props, { tabPanelProps } = $34bce698202e07cb$export$fae0121b5afe572d(props, state, ref), { focusProps, isFocused, isFocusVisible } = $f7dceffc5ad7768b$export$4e328f61c538687f(), isSelected = state.selectedKey === props.id, renderProps = $64fa3d84918910a7$export$4d86445c2cf5e3({
    ...props,
    defaultClassName: "react-aria-TabPanel",
    values: {
      isFocused,
      isFocusVisible,
      // @ts-ignore - compatibility with React < 19
      isInert: $cdc5a6778b766db2$export$a9d04c5684123369(!isSelected),
      state
    }
  });
  if (!isSelected && !props.shouldForceMount) return null;
  let DOMProps = $65484d02dcb7eb3e$export$457c3d6518dd4c6f(otherProps, {
    global: !0
  });
  delete DOMProps.id;
  let domProps = isSelected ? $3ef42575df84b30b$export$9d1611c77c2fe928(DOMProps, tabPanelProps, focusProps, renderProps) : renderProps;
  return $7aSLZ$react.createElement("div", {
    ...domProps,
    ref,
    "data-focused": isFocused || void 0,
    "data-focus-visible": isFocusVisible || void 0,
    // @ts-ignore
    inert: $cdc5a6778b766db2$export$a9d04c5684123369(!isSelected || props.inert),
    "data-inert": isSelected ? void 0 : "true"
  }, $7aSLZ$react.createElement($64fa3d84918910a7$export$2881499e37b75b9a, {
    values: [
      [
        $5e8ad37a45e1c704$export$cfa7aa87c26e7d1f,
        null
      ],
      [
        $5e8ad37a45e1c704$export$364712098d2aa57c,
        null
      ]
    ]
  }, $7aSLZ$react.createElement($7135fc7d473fd974$export$4feb769f8ddf26c5.Provider, {
    value: $7135fc7d473fd974$export$a164736487e3f0ae
  }, renderProps.children)));
});

// src/components/components/Tabs/StatelessTabList.tsx
import { styled as styled63 } from "storybook/theming";
var Root = styled63.div({
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
  position: "relative",
  overflow: "hidden"
}), ScrollContainer2 = styled63.div({
  display: "flex",
  overflowX: "auto",
  scrollbarWidth: "none",
  msOverflowStyle: "none",
  WebkitScrollbar: "none",
  scrollSnapType: "x mandatory",
  flex: 1,
  "&::-webkit-scrollbar": {
    display: "none"
  }
}), StyledTabList2 = styled63($5e8ad37a45e1c704$export$e51a686c67fdaa2d)({
  display: "flex",
  flexShrink: 0
}), SCROLL_BUTTON_WIDTH2 = 28, ScrollButtonContainer2 = styled63.div(({ $showStartBorder, $showEndBorder, theme }) => ({
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 6,
  boxShadow: $showStartBorder ? `inset 1px 0 0 ${theme.appBorderColor}` : $showEndBorder ? `inset -1px 0 0 ${theme.appBorderColor}` : "none"
})), ScrollButton2 = styled63(Button)({
  flexShrink: 0,
  paddingInline: 0,
  width: 16
}), StatelessTabList = ({ children, ...rest }) => {
  let containerRef = useRef13(null), scrollContainerRef = useRef13(null), [showScrollButtons, setShowScrollButtons] = useState15(!1), [canScrollLeft, setCanScrollLeft] = useState15(!1), [canScrollRight, setCanScrollRight] = useState15(!1), updateScrollState = useCallback13(() => {
    let scrollContainer = scrollContainerRef.current, container = containerRef.current;
    if (!scrollContainer || !container)
      return;
    let { scrollLeft, scrollWidth, clientWidth } = scrollContainer, availableWidth = container.clientWidth - (showScrollButtons ? SCROLL_BUTTON_WIDTH2 * 2 : 0), needsScrolling = scrollWidth > availableWidth;
    setShowScrollButtons(needsScrolling), needsScrolling ? (setCanScrollLeft(scrollLeft > 0), setCanScrollRight(scrollLeft < scrollWidth - clientWidth)) : (setCanScrollLeft(!1), setCanScrollRight(!1));
  }, [showScrollButtons]), throttledUpdateScrollState = useCallback13(() => {
    updateScrollState();
  }, [updateScrollState]);
  useEffect10(() => {
    let scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || typeof window > "u")
      return;
    scrollContainer.addEventListener("scroll", throttledUpdateScrollState, { passive: !0 });
    let resizeObserver = null;
    typeof ResizeObserver < "u" && (resizeObserver = new ResizeObserver(throttledUpdateScrollState), resizeObserver.observe(scrollContainer));
    let timeoutId = setTimeout(throttledUpdateScrollState, 0);
    return () => {
      clearTimeout(timeoutId), scrollContainer.removeEventListener("scroll", throttledUpdateScrollState), resizeObserver && resizeObserver.disconnect();
    };
  }, [throttledUpdateScrollState]);
  let scroll = useCallback13((direction) => {
    let scrollContainer = scrollContainerRef.current, container = containerRef.current;
    if (!scrollContainer || !container || typeof window > "u")
      return;
    let availableWidth = container.clientWidth - SCROLL_BUTTON_WIDTH2 * 2, scrollDistance = direction === "backward" ? -availableWidth : availableWidth;
    typeof scrollContainer.scrollBy == "function" ? scrollContainer.scrollBy({ left: scrollDistance, behavior: "smooth" }) : scrollContainer.scrollLeft += scrollDistance;
  }, []), scrollBackward = useCallback13(() => scroll("backward"), [scroll]), scrollForward = useCallback13(() => scroll("forward"), [scroll]);
  return React56.createElement(Root, { ref: containerRef, className: `tablist ${showScrollButtons ? "tablist-has-scroll" : ""}` }, showScrollButtons && React56.createElement(ScrollButtonContainer2, { $showEndBorder: canScrollLeft }, React56.createElement(
    ScrollButton2,
    {
      variant: "ghost",
      padding: "small",
      size: "small",
      ariaLabel: "Scroll backward",
      disabled: !canScrollLeft,
      onClick: scrollBackward,
      tabIndex: -1
    },
    React56.createElement(ChevronSmallLeftIcon2, null)
  )), React56.createElement(ScrollContainer2, { ref: scrollContainerRef }, React56.createElement(StyledTabList2, { ...rest }, children)), showScrollButtons && React56.createElement(ScrollButtonContainer2, { $showStartBorder: canScrollRight }, React56.createElement(
    ScrollButton2,
    {
      variant: "ghost",
      padding: "small",
      size: "small",
      ariaLabel: "Scroll forward",
      disabled: !canScrollRight,
      onClick: scrollForward,
      tabIndex: -1
    },
    React56.createElement(ChevronSmallRightIcon2, null)
  )));
};

// src/components/components/Tabs/StatelessTabPanel.tsx
import React57 from "react";
import { styled as styled64 } from "storybook/theming";
var Root2 = styled64($5e8ad37a45e1c704$export$3d96ec278d3efce4)({
  overflowY: "hidden",
  height: "100%",
  display: "block",
  '&[inert="true"]': { display: "none" }
}), StatelessTabPanel = ({
  children,
  hasScrollbar = !0,
  name,
  ...rest
}) => React57.createElement(Root2, { ...rest, shouldForceMount: !0, id: name }, hasScrollbar ? React57.createElement(ScrollArea, { vertical: !0 }, children) : children);

// src/components/components/Tabs/StatelessTabsView.tsx
import React58 from "react";
import { styled as styled65 } from "storybook/theming";
var Container5 = styled65($5e8ad37a45e1c704$export$b2539bed5023c21c)(({ $simulatedGap }) => ({
  display: "flex",
  flexDirection: "column",
  height: "100%",
  ".tablist": {
    flex: "1 1 100%"
  },
  ".tablist.tablist-has-scroll": {
    marginInlineEnd: $simulatedGap
  },
  "& > :not(:first-child)": { flex: 1 }
})), StatelessTabsView = ({
  backgroundColor,
  barInnerStyle,
  children,
  defaultSelected,
  emptyState,
  onSelectionChange,
  selected,
  showToolsWhenEmpty,
  tools,
  ...props
}) => {
  let EmptyContent = emptyState ?? React58.createElement(EmptyTabContent, { title: "Nothing found" }), [tabListChild, ...tabPanelChildren] = React58.Children.toArray(children), hasContent = tabPanelChildren && tabPanelChildren.length > 0;
  return !showToolsWhenEmpty && !hasContent ? EmptyContent : React58.createElement(
    Container5,
    {
      ...props,
      $simulatedGap: barInnerStyle?.gap ?? 6,
      defaultSelectedKey: defaultSelected,
      onSelectionChange: (k) => onSelectionChange?.(k ? `${k}` : ""),
      selectedKey: selected
    },
    React58.createElement(
      Bar,
      {
        scrollable: !1,
        border: !0,
        backgroundColor,
        innerStyle: {
          display: "flex",
          justifyContent: "space-between",
          paddingInlineStart: 0,
          paddingInlineEnd: 10,
          // A11y: the tools must be before the tab list in the DOM for correct tab order.
          // This lets us control order without adding a wrapper div, leading to better flex
          // behavior on tools for our callees (e.g. containerType: 'inline-size' in a11y-addon).
          "> *:not(:last-child)": {
            order: 2
          },
          "> *": {
            flexShrink: 0
          },
          ...barInnerStyle,
          gap: 0
        }
      },
      tools,
      hasContent ? tabListChild : React58.createElement("div", null)
    ),
    hasContent ? tabPanelChildren : EmptyContent
  );
};

// src/components/components/Tabs/StatelessTab.tsx
import React59 from "react";
import { styled as styled66 } from "storybook/theming";
var StyledTab = styled66($5e8ad37a45e1c704$export$3e41faf802a29e71)(({ theme }) => ({
  whiteSpace: "normal",
  display: "inline-flex",
  overflow: "hidden",
  verticalAlign: "top",
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
  textDecoration: "none",
  scrollSnapAlign: "start",
  "&:empty": {
    display: "none"
  },
  "&[hidden]": {
    display: "none"
  },
  padding: "0 15px",
  transition: "color 0.2s linear, border-bottom-color 0.2s linear",
  height: 40,
  lineHeight: "12px",
  cursor: "pointer",
  background: "transparent",
  border: "0 solid transparent",
  borderTop: "3px solid transparent",
  borderBottom: "3px solid transparent",
  fontWeight: "bold",
  fontSize: 13,
  "&:focus-visible": {
    outline: "0 none",
    boxShadow: `inset 0 0 0 2px ${theme.barSelectedColor}`
  },
  color: theme.barTextColor,
  borderBottomColor: "transparent",
  "&:hover": {
    color: theme.barHoverColor
  },
  "&[data-selected]": {
    color: theme.barSelectedColor,
    borderBottomColor: theme.barSelectedColor
  }
})), StatelessTab = ({ name, ...props }) => React59.createElement(StyledTab, { id: name, ...props });

// src/components/brand/StorybookLogo.tsx
import React60 from "react";
var StorybookLogo = ({ alt, ...props }) => React60.createElement("svg", { width: "200px", height: "40px", viewBox: "0 0 200 40", ...props, role: "img" }, alt ? React60.createElement("title", null, alt) : null, React60.createElement("defs", null, React60.createElement(
  "path",
  {
    d: "M1.2 36.9L0 3.9c0-1.1.8-2 1.9-2.1l28-1.8a2 2 0 0 1 2.2 1.9 2 2 0 0 1 0 .1v36a2 2 0 0 1-2 2 2 2 0 0 1-.1 0L3.2 38.8a2 2 0 0 1-2-2z",
    id: "a"
  }
)), React60.createElement("g", { fill: "none", fillRule: "evenodd" }, React60.createElement(
  "path",
  {
    d: "M53.3 31.7c-1.7 0-3.4-.3-5-.7-1.5-.5-2.8-1.1-3.9-2l1.6-3.5c2.2 1.5 4.6 2.3 7.3 2.3 1.5 0 2.5-.2 3.3-.7.7-.5 1.1-1 1.1-1.9 0-.7-.3-1.3-1-1.7s-2-.8-3.7-1.2c-2-.4-3.6-.9-4.8-1.5-1.1-.5-2-1.2-2.6-2-.5-1-.8-2-.8-3.2 0-1.4.4-2.6 1.2-3.6.7-1.1 1.8-2 3.2-2.6 1.3-.6 2.9-.9 4.7-.9 1.6 0 3.1.3 4.6.7 1.5.5 2.7 1.1 3.5 2l-1.6 3.5c-2-1.5-4.2-2.3-6.5-2.3-1.3 0-2.3.2-3 .8-.8.5-1.2 1.1-1.2 2 0 .5.2 1 .5 1.3.2.3.7.6 1.4.9l2.9.8c2.9.6 5 1.4 6.2 2.4a5 5 0 0 1 2 4.2 6 6 0 0 1-2.5 5c-1.7 1.2-4 1.9-7 1.9zm21-3.6l1.4-.1-.2 3.5-1.9.1c-2.4 0-4.1-.5-5.2-1.5-1.1-1-1.6-2.7-1.6-4.8v-6h-3v-3.6h3V11h4.8v4.6h4v3.6h-4v6c0 1.8.9 2.8 2.6 2.8zm11.1 3.5c-1.6 0-3-.3-4.3-1a7 7 0 0 1-3-2.8c-.6-1.3-1-2.7-1-4.4 0-1.6.4-3 1-4.3a7 7 0 0 1 3-2.8c1.2-.7 2.7-1 4.3-1 1.7 0 3.2.3 4.4 1a7 7 0 0 1 3 2.8c.6 1.2 1 2.7 1 4.3 0 1.7-.4 3.1-1 4.4a7 7 0 0 1-3 2.8c-1.2.7-2.7 1-4.4 1zm0-3.6c2.4 0 3.6-1.6 3.6-4.6 0-1.5-.3-2.6-1-3.4a3.2 3.2 0 0 0-2.6-1c-2.3 0-3.5 1.4-3.5 4.4 0 3 1.2 4.6 3.5 4.6zm21.7-8.8l-2.7.3c-1.3.2-2.3.5-2.8 1.2-.6.6-.9 1.4-.9 2.5v8.2H96V15.7h4.6v2.6c.8-1.8 2.5-2.8 5-3h1.3l.3 4zm14-3.5h4.8L116.4 37h-4.9l3-6.6-6.4-14.8h5l4 10 4-10zm16-.4c1.4 0 2.6.3 3.6 1 1 .6 1.9 1.6 2.5 2.8.6 1.2.9 2.7.9 4.3 0 1.6-.3 3-1 4.3a6.9 6.9 0 0 1-2.4 2.9c-1 .7-2.2 1-3.6 1-1 0-2-.2-3-.7-.8-.4-1.5-1-2-1.9v2.4h-4.7V8.8h4.8v9c.5-.8 1.2-1.4 2-1.9.9-.4 1.8-.6 3-.6zM135.7 28c1.1 0 2-.4 2.6-1.2.6-.8 1-2 1-3.4 0-1.5-.4-2.5-1-3.3s-1.5-1.1-2.6-1.1-2 .3-2.6 1.1c-.6.8-1 2-1 3.3 0 1.5.4 2.6 1 3.4.6.8 1.5 1.2 2.6 1.2zm18.9 3.6c-1.7 0-3.2-.3-4.4-1a7 7 0 0 1-3-2.8c-.6-1.3-1-2.7-1-4.4 0-1.6.4-3 1-4.3a7 7 0 0 1 3-2.8c1.2-.7 2.7-1 4.4-1 1.6 0 3 .3 4.3 1a7 7 0 0 1 3 2.8c.6 1.2 1 2.7 1 4.3 0 1.7-.4 3.1-1 4.4a7 7 0 0 1-3 2.8c-1.2.7-2.7 1-4.3 1zm0-3.6c2.3 0 3.5-1.6 3.5-4.6 0-1.5-.3-2.6-1-3.4a3.2 3.2 0 0 0-2.5-1c-2.4 0-3.6 1.4-3.6 4.4 0 3 1.2 4.6 3.6 4.6zm18 3.6c-1.7 0-3.2-.3-4.4-1a7 7 0 0 1-3-2.8c-.6-1.3-1-2.7-1-4.4 0-1.6.4-3 1-4.3a7 7 0 0 1 3-2.8c1.2-.7 2.7-1 4.4-1 1.6 0 3 .3 4.4 1a7 7 0 0 1 2.9 2.8c.6 1.2 1 2.7 1 4.3 0 1.7-.4 3.1-1 4.4a7 7 0 0 1-3 2.8c-1.2.7-2.7 1-4.3 1zm0-3.6c2.3 0 3.5-1.6 3.5-4.6 0-1.5-.3-2.6-1-3.4a3.2 3.2 0 0 0-2.5-1c-2.4 0-3.6 1.4-3.6 4.4 0 3 1.2 4.6 3.6 4.6zm27.4 3.4h-6l-6-7v7h-4.8V8.8h4.9v13.6l5.8-6.7h5.7l-6.6 7.5 7 8.2z",
    fill: "currentColor"
  }
), React60.createElement("mask", { id: "b", fill: "#fff" }, React60.createElement("use", { xlinkHref: "#a" })), React60.createElement("use", { fill: "#FF4785", fillRule: "nonzero", xlinkHref: "#a" }), React60.createElement(
  "path",
  {
    d: "M23.7 5L24 .2l3.9-.3.1 4.8a.3.3 0 0 1-.5.2L26 3.8l-1.7 1.4a.3.3 0 0 1-.5-.3zm-5 10c0 .9 5.3.5 6 0 0-5.4-2.8-8.2-8-8.2-5.3 0-8.2 2.8-8.2 7.1 0 7.4 10 7.6 10 11.6 0 1.2-.5 1.9-1.8 1.9-1.6 0-2.2-.9-2.1-3.6 0-.6-6.1-.8-6.3 0-.5 6.7 3.7 8.6 8.5 8.6 4.6 0 8.3-2.5 8.3-7 0-7.9-10.2-7.7-10.2-11.6 0-1.6 1.2-1.8 2-1.8.6 0 2 0 1.9 3z",
    fill: "#FFF",
    fillRule: "nonzero",
    mask: "url(#b)"
  }
)));

// src/components/brand/StorybookIcon.tsx
import React61 from "react";
var StorybookIcon = (props) => React61.createElement("svg", { viewBox: "0 0 64 64", ...props }, React61.createElement("title", null, "Storybook icon"), React61.createElement("g", { id: "Artboard", stroke: "none", strokeWidth: "1", fill: "none", fillRule: "evenodd" }, React61.createElement(
  "path",
  {
    d: "M8.04798541,58.7875918 L6.07908839,6.32540407 C6.01406344,4.5927838 7.34257463,3.12440831 9.07303814,3.01625434 L53.6958037,0.227331489 C55.457209,0.117243658 56.974354,1.45590096 57.0844418,3.21730626 C57.0885895,3.28366922 57.0906648,3.35014546 57.0906648,3.41663791 L57.0906648,60.5834697 C57.0906648,62.3483119 55.6599776,63.7789992 53.8951354,63.7789992 C53.847325,63.7789992 53.7995207,63.7779262 53.7517585,63.775781 L11.0978899,61.8600599 C9.43669044,61.7854501 8.11034889,60.4492961 8.04798541,58.7875918 Z",
    id: "path-1",
    fill: "#FF4785",
    fillRule: "nonzero"
  }
), React61.createElement(
  "path",
  {
    d: "M35.9095005,24.1768792 C35.9095005,25.420127 44.2838488,24.8242707 45.4080313,23.9509748 C45.4080313,15.4847538 40.8652557,11.0358878 32.5466666,11.0358878 C24.2280775,11.0358878 19.5673077,15.553972 19.5673077,22.3311017 C19.5673077,34.1346028 35.4965208,34.3605071 35.4965208,40.7987804 C35.4965208,42.606015 34.6115646,43.6790606 32.6646607,43.6790606 C30.127786,43.6790606 29.1248356,42.3834613 29.2428298,37.9783269 C29.2428298,37.0226907 19.5673077,36.7247626 19.2723223,37.9783269 C18.5211693,48.6535354 25.1720308,51.7326752 32.7826549,51.7326752 C40.1572906,51.7326752 45.939005,47.8018145 45.939005,40.6858282 C45.939005,28.035186 29.7738035,28.3740425 29.7738035,22.1051974 C29.7738035,19.5637737 31.6617103,19.2249173 32.7826549,19.2249173 C33.9625966,19.2249173 36.0864917,19.4328883 35.9095005,24.1768792 Z",
    id: "path9_fill-path",
    fill: "#FFFFFF",
    fillRule: "nonzero"
  }
), React61.createElement(
  "path",
  {
    d: "M44.0461638,0.830433986 L50.1874092,0.446606143 L50.443532,7.7810017 C50.4527198,8.04410717 50.2468789,8.26484453 49.9837734,8.27403237 C49.871115,8.27796649 49.7607078,8.24184808 49.6721567,8.17209069 L47.3089847,6.3104681 L44.5110468,8.43287463 C44.3012992,8.591981 44.0022839,8.55092814 43.8431776,8.34118051 C43.7762017,8.25288717 43.742082,8.14401677 43.7466857,8.03329059 L44.0461638,0.830433986 Z",
    id: "Path",
    fill: "#FFFFFF"
  }
)));

// src/components/components/Loader/Loader.tsx
import React62 from "react";
import { LightningOffIcon } from "@storybook/icons";
import { keyframes as keyframes4, styled as styled67 } from "storybook/theming";

// src/components/components/shared/animation.ts
import { keyframes as keyframes3 } from "storybook/theming";
var rotate360 = keyframes3`
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
`;

// src/components/components/Loader/Loader.tsx
var LoaderWrapper = styled67.div(({ size = 32 }) => ({
  borderRadius: "50%",
  cursor: "progress",
  display: "inline-block",
  overflow: "hidden",
  position: "absolute",
  transition: "all 200ms ease-out",
  verticalAlign: "top",
  top: "50%",
  left: "50%",
  marginTop: -(size / 2),
  marginLeft: -(size / 2),
  height: size,
  width: size,
  zIndex: 4,
  borderWidth: 2,
  borderStyle: "solid",
  borderColor: "rgba(97, 97, 97, 0.29)",
  borderTopColor: "rgb(100,100,100)",
  animation: `${rotate360} 0.7s linear infinite`,
  mixBlendMode: "difference"
})), ProgressWrapper = styled67.div({
  position: "absolute",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  width: "100%",
  height: "100%"
}), ProgressTrack = styled67.div(({ theme }) => ({
  position: "relative",
  width: "80%",
  marginBottom: "0.75rem",
  maxWidth: 300,
  height: 5,
  borderRadius: 5,
  background: curriedTransparentize$1(0.8, theme.color.secondary),
  overflow: "hidden",
  cursor: "progress"
})), ProgressBar2 = styled67.div(({ theme }) => ({
  position: "absolute",
  top: 0,
  left: 0,
  height: "100%",
  background: theme.color.secondary
})), ProgressMessage = styled67.div(({ theme }) => ({
  minHeight: "2em",
  fontSize: `${theme.typography.size.s1}px`,
  color: theme.textMutedColor
})), ErrorIcon = styled67(LightningOffIcon)(({ theme }) => ({
  width: 20,
  height: 20,
  marginBottom: "0.5rem",
  color: theme.textMutedColor
})), ellipsis = keyframes4`
  from { content: "..." }
  33% { content: "." }
  66% { content: ".." }
  to { content: "..." }
`, Ellipsis = styled67.span({
  "&::after": {
    content: "'...'",
    animation: `${ellipsis} 1s linear infinite`,
    animationDelay: "1s",
    display: "inline-block",
    width: "1em",
    height: "auto"
  }
}), Loader = ({ progress, error, size, ...props }) => {
  if (error)
    return React62.createElement(ProgressWrapper, { "aria-label": error.toString(), "aria-live": "polite", role: "status", ...props }, React62.createElement(ErrorIcon, null), React62.createElement(ProgressMessage, null, error.message));
  if (progress) {
    let { value, modules } = progress, { message } = progress;
    return modules && (message += ` ${modules.complete} / ${modules.total} modules`), React62.createElement(
      ProgressWrapper,
      {
        "aria-label": "Content is loading...",
        "aria-live": "polite",
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        "aria-valuenow": value * 100,
        "aria-valuetext": message,
        role: "progressbar",
        ...props
      },
      React62.createElement(ProgressTrack, null, React62.createElement(ProgressBar2, { style: { width: `${value * 100}%` } })),
      React62.createElement(ProgressMessage, null, message, value < 1 && React62.createElement(Ellipsis, { key: message }))
    );
  }
  return React62.createElement(
    LoaderWrapper,
    {
      "aria-label": "Content is loading...",
      "aria-live": "polite",
      role: "status",
      size,
      ...props
    }
  );
};

// src/components/components/ProgressSpinner/ProgressSpinner.tsx
import React63 from "react";
import { keyframes as keyframes5, styled as styled68 } from "storybook/theming";
var XMLNS = "http://www.w3.org/2000/svg", rotate = keyframes5({
  "0%": {
    transform: "rotate(0deg)"
  },
  "100%": {
    transform: "rotate(360deg)"
  }
}), Wrapper5 = styled68.div(({ size }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  minWidth: size,
  minHeight: size
})), Circle = styled68.svg(
  ({ size, width }) => ({
    position: "absolute",
    width: `${size}px!important`,
    height: `${size}px!important`,
    transform: "rotate(-90deg)",
    circle: {
      r: (size - Math.ceil(width)) / 2,
      cx: size / 2,
      cy: size / 2,
      opacity: 0.15,
      fill: "transparent",
      stroke: "currentColor",
      strokeWidth: width,
      strokeLinecap: "round",
      strokeDasharray: Math.PI * (size - Math.ceil(width))
    }
  }),
  ({ progress }) => progress && {
    circle: {
      opacity: 0.75
    }
  },
  ({ spinner }) => spinner && {
    animation: `${rotate} 1s linear infinite`,
    circle: {
      opacity: 0.25
    }
  }
), ProgressSpinner = ({
  percentage = void 0,
  running = !0,
  size = 24,
  width = 1.5,
  children = null,
  ...props
}) => typeof percentage == "number" ? React63.createElement(Wrapper5, { size, ...props }, children, React63.createElement(Circle, { size, width, xmlns: XMLNS }, React63.createElement("circle", null)), running && React63.createElement(Circle, { size, width, xmlns: XMLNS, spinner: !0 }, React63.createElement("circle", { strokeDashoffset: Math.PI * (size - Math.ceil(width)) * (1 - percentage / 100) })), React63.createElement(Circle, { size, width, xmlns: XMLNS, progress: !0 }, React63.createElement("circle", { strokeDashoffset: Math.PI * (size - Math.ceil(width)) * (1 - percentage / 100) }))) : React63.createElement(Wrapper5, { size, ...props }, children);

// src/components/components/utils/getStoryHref.ts
function parseQuery(queryString) {
  let query = {}, pairs = queryString.split("&");
  for (let i = 0; i < pairs.length; i++) {
    let pair = pairs[i].split("=");
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || "");
  }
  return query;
}
var getStoryHref = (baseUrl, storyId, additionalParams = {}) => {
  let [url, paramsStr] = baseUrl.split("?"), params = paramsStr ? {
    ...parseQuery(paramsStr),
    ...additionalParams,
    id: storyId
  } : {
    ...additionalParams,
    id: storyId
  };
  return `${url}?${Object.entries(params).map((item) => `${item[0]}=${item[1]}`).join("&")}`;
};

// src/components/components/clipboard/ClipboardCode.tsx
import React64 from "react";
import { color as color3, styled as styled69, typography } from "storybook/theming";
var Code2 = styled69.pre`
  line-height: 18px;
  padding: 11px 1rem;
  white-space: pre-wrap;
  background: rgba(0, 0, 0, 0.05);
  color: ${color3.darkest};
  border-radius: 3px;
  margin: 1rem 0;
  width: 100%;
  display: block;
  overflow: hidden;
  font-family: ${typography.fonts.mono};
  font-size: ${typography.size.s2 - 1}px;
`, ClipboardCode = ({ code, ...props }) => React64.createElement(Code2, { id: "clipboard-code", ...props }, code);

// src/components/index.ts
var components2 = components, resetComponents = {};
Object.keys(components).forEach((key) => {
  resetComponents[key] = forwardRef18((props, ref) => createElement2(key, { ...props, ref }));
});
export {
  A,
  AbstractToolbar,
  ActionBar,
  ActionList,
  AddonPanel,
  Badge,
  Bar,
  Blockquote,
  Button,
  Card,
  ClipboardCode,
  Code,
  Collapsible,
  DL,
  Div,
  DocumentWrapper,
  EmptyTabContent,
  ErrorFormatter,
  FlexBar,
  Form,
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  HR,
  IconButton,
  Img,
  LI,
  Link2 as Link,
  ListItem_default as ListItem,
  Loader,
  Modal,
  ModalDecorator,
  OL,
  P,
  Placeholder,
  Popover,
  PopoverProvider,
  Pre,
  ProgressSpinner,
  ResetWrapper,
  ScrollArea,
  Select2 as Select,
  Separator2 as Separator,
  Spaced,
  Span,
  StatelessTab,
  StatelessTabList,
  StatelessTabPanel,
  StatelessTabsView,
  StorybookIcon,
  StorybookLogo,
  SyntaxHighlighter,
  TT,
  TabBar,
  TabButton,
  TabList,
  TabPanel,
  TabWrapper,
  Table,
  Tabs,
  TabsState,
  TabsView,
  ToggleButton,
  Toolbar,
  Tooltip2 as Tooltip,
  TooltipLinkList,
  TooltipMessage,
  TooltipNote,
  TooltipProvider,
  UL,
  WithTooltip,
  WithTooltipPure,
  Zoom,
  codeCommon,
  components2 as components,
  convertToReactAriaPlacement,
  createCopyToClipboardFunction,
  getStoryHref,
  interleaveSeparators,
  nameSpaceClassNames,
  resetComponents,
  useTabsState,
  withReset
};
