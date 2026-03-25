/*!
 * github-buttons v2.29.1
 * (c) 2024 なつき
 * @license BSD-2-Clause
 */
var document = window.document;

var Math = window.Math;

var HTMLElement = window.HTMLElement;

var XMLHttpRequest = window.XMLHttpRequest;

var forEach = function (obj, func) {
  for (var i = 0, len = obj.length; i < len; i++) {
    func(obj[i]);
  }
};

var createElementInDocument = function (document) {
  return function (tag, props, children) {
    var el = document.createElement(tag);
    if (props != null) {
      for (var prop in props) {
        var val = props[prop];
        if (val != null) {
          if (el[prop] != null) {
            el[prop] = val;
          } else {
            el.setAttribute(prop, val);
          }
        }
      }
    }
    if (children != null) {
      forEach(children, function (child) {
        el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
      });
    }
    return el
  }
};

var createElement = createElementInDocument(document);

var dispatchOnce = function (func) {
  var onceToken;
  return function () {
    if (!onceToken) {
      onceToken = 1;
      func.apply(this, arguments);
    }
  }
};

var hasOwnProperty = function (obj, prop) {
  return {}.hasOwnProperty.call(obj, prop)
};

var toLowerCase = function (obj) {
  return ('' + obj).toLowerCase()
};

var name = "github-buttons";
var version = "2.29.1";

var iframeURL = 'https://' + (/* istanbul ignore next */ 'unpkg.com/' + name + '@' + version + '/dist' ) + '/buttons.html';

var domain = 'github.com';

var apiBaseURL = 'https://api.' + domain;

var useXHR = XMLHttpRequest && 'prototype' in XMLHttpRequest && 'withCredentials' in XMLHttpRequest.prototype;

var useShadowDOM = useXHR && HTMLElement && 'attachShadow' in HTMLElement.prototype && !('prototype' in HTMLElement.prototype.attachShadow);

var onEvent = function (target, eventName, func) {
  /* istanbul ignore else: IE lt 9 */
  if (target.addEventListener) {
    target.addEventListener(eventName, func, false);
  } else {
    target.attachEvent('on' + eventName, func);
  }
};

var offEvent = function (target, eventName, func) {
  /* istanbul ignore else: IE lt 9 */
  if (target.removeEventListener) {
    target.removeEventListener(eventName, func, false);
  } else {
    target.detachEvent('on' + eventName, func);
  }
};

var onceEvent = function (target, eventName, func) {
  var callback = function () {
    offEvent(target, eventName, callback);
    return func.apply(this, arguments)
  };
  onEvent(target, eventName, callback);
};

var onceReadyStateChange = /* istanbul ignore next: IE lt 9 */ function (target, regex, func) {
  if (target.readyState != null) {
    var eventName = 'readystatechange';
    var callback = function () {
      if (regex.test(target.readyState)) {
        offEvent(target, eventName, callback);
        return func.apply(this, arguments)
      }
    };
    onEvent(target, eventName, callback);
  }
};

var parseOptions = function (anchor) {
  var options = {
    href: anchor.href,
    title: anchor.title,
    'aria-label': anchor.getAttribute('aria-label')
  };

  forEach(['icon', 'color-scheme', 'text', 'size', 'show-count'], function (option) {
    var attribute = 'data-' + option;
    options[attribute] = anchor.getAttribute(attribute);
  });

  if (options['data-text'] == null) {
    options['data-text'] = anchor.textContent || anchor.innerText;
  }

  return options
};

var buttonsCssText = "body{margin:0}a{text-decoration:none;outline:0}.widget{display:inline-block;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;font-size:0;line-height:0;white-space:nowrap}.btn,.social-count{position:relative;display:inline-block;display:inline-flex;height:14px;padding:2px 5px;font-size:11px;font-weight:600;line-height:14px;vertical-align:bottom;cursor:pointer;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;background-repeat:repeat-x;background-position:-1px -1px;background-size:110% 110%;border:1px solid}.btn{border-radius:.25em}.btn:not(:last-child){border-radius:.25em 0 0 .25em}.social-count{border-left:0;border-radius:0 .25em .25em 0}.widget-lg .btn,.widget-lg .social-count{height:16px;padding:5px 10px;font-size:12px;line-height:16px}.octicon{display:inline-block;vertical-align:text-top;fill:currentColor;overflow:visible}";

var light = ".btn:focus-visible,.social-count:focus-visible{outline:2px solid #0969da;outline-offset:-2px}.btn{color:#25292e;background-color:#ebf0f4;border-color:#d1d9e0;background-image:url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg'%3e%3clinearGradient id='o' x2='0' y2='1'%3e%3cstop stop-color='%23f6f8fa'/%3e%3cstop offset='90%25' stop-color='%23ebf0f4'/%3e%3c/linearGradient%3e%3crect width='100%25' height='100%25' fill='url(%23o)'/%3e%3c/svg%3e\");background-image:-moz-linear-gradient(top, #f6f8fa, #ebf0f4 90%);background-image:linear-gradient(180deg, #f6f8fa, #ebf0f4 90%);filter:progid:DXImageTransform.Microsoft.Gradient(startColorstr='#FFF6F8FA', endColorstr='#FFEAEFF3')}:root .btn{filter:none}.btn:hover,.btn:focus{background-color:#e5eaee;background-position:0 -0.5em;border-color:#d1d9e0;background-image:url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg'%3e%3clinearGradient id='o' x2='0' y2='1'%3e%3cstop stop-color='%23eff2f5'/%3e%3cstop offset='90%25' stop-color='%23e5eaee'/%3e%3c/linearGradient%3e%3crect width='100%25' height='100%25' fill='url(%23o)'/%3e%3c/svg%3e\");background-image:-moz-linear-gradient(top, #eff2f5, #e5eaee 90%);background-image:linear-gradient(180deg, #eff2f5, #e5eaee 90%);filter:progid:DXImageTransform.Microsoft.Gradient(startColorstr='#FFEFF2F5', endColorstr='#FFE4E9ED')}:root .btn:hover,:root .btn:focus{filter:none}.btn:active{background-color:#e6eaef;border-color:#d1d9e0;background-image:none;filter:none}.social-count{color:#25292e;background-color:#fff;border-color:#d1d9e0}.social-count:hover,.social-count:focus{color:#0969da}.octicon-heart{color:#bf3989}";

var lightHighContrast = ".btn:focus-visible,.social-count:focus-visible{outline:2px solid #0349b4;outline-offset:-2px}.btn{color:#25292e;background-color:#e0e6eb;border-color:#454c54;background-image:none;filter:none}.btn:hover,.btn:focus{background-color:#d0d7e0;background-position:0 -0.5em;border-color:#454c54;background-image:none;filter:none}.btn:active{background-color:#d1d9e0;border-color:#454c54}.social-count{color:#25292e;background-color:#fff;border-color:#454c54}.social-count:hover,.social-count:focus{color:#023b95}.octicon-heart{color:#7d0c57}";

var dark = ".btn:focus-visible,.social-count:focus-visible{outline:2px solid #1f6feb;outline-offset:-2px}.btn{color:#f0f6fc;background-color:#1a2026;border-color:#3d444d;background-image:url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg'%3e%3clinearGradient id='o' x2='0' y2='1'%3e%3cstop stop-color='%23212830'/%3e%3cstop offset='90%25' stop-color='%231a2026'/%3e%3c/linearGradient%3e%3crect width='100%25' height='100%25' fill='url(%23o)'/%3e%3c/svg%3e\");background-image:-moz-linear-gradient(top, #212830, #1a2026 90%);background-image:linear-gradient(180deg, #212830, #1a2026 90%);filter:progid:DXImageTransform.Microsoft.Gradient(startColorstr='#FF212830', endColorstr='#FF191F25')}:root .btn{filter:none}.btn:hover,.btn:focus{background-color:#1f242c;background-position:0 -0.5em;border-color:#3d444d;background-image:url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg'%3e%3clinearGradient id='o' x2='0' y2='1'%3e%3cstop stop-color='%23262c36'/%3e%3cstop offset='90%25' stop-color='%231f242c'/%3e%3c/linearGradient%3e%3crect width='100%25' height='100%25' fill='url(%23o)'/%3e%3c/svg%3e\");background-image:-moz-linear-gradient(top, #262c36, #1f242c 90%);background-image:linear-gradient(180deg, #262c36, #1f242c 90%);filter:progid:DXImageTransform.Microsoft.Gradient(startColorstr='#FF262C36', endColorstr='#FF1E232B')}:root .btn:hover,:root .btn:focus{filter:none}.btn:active{background-color:#2a313c;border-color:#3d444d;background-image:none;filter:none}.social-count{color:#f0f6fc;background-color:#0d1117;border-color:#3d444d}.social-count:hover,.social-count:focus{color:#388bfd}.octicon-heart{color:#db61a2}";

var darkDimmed = ".btn:focus-visible,.social-count:focus-visible{outline:2px solid #316dca;outline-offset:-2px}.btn{color:#d1d7e0;background-color:#232932;border-color:#3d444d;background-image:url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg'%3e%3clinearGradient id='o' x2='0' y2='1'%3e%3cstop stop-color='%232a313c'/%3e%3cstop offset='90%25' stop-color='%23232932'/%3e%3c/linearGradient%3e%3crect width='100%25' height='100%25' fill='url(%23o)'/%3e%3c/svg%3e\");background-image:-moz-linear-gradient(top, #2a313c, #232932 90%);background-image:linear-gradient(180deg, #2a313c, #232932 90%);filter:progid:DXImageTransform.Microsoft.Gradient(startColorstr='#FF2A313C', endColorstr='#FF222831')}:root .btn{filter:none}.btn:hover,.btn:focus{background-color:#282f38;background-position:0 -0.5em;border-color:#3d444d;background-image:url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg'%3e%3clinearGradient id='o' x2='0' y2='1'%3e%3cstop stop-color='%232f3742'/%3e%3cstop offset='90%25' stop-color='%23282f38'/%3e%3c/linearGradient%3e%3crect width='100%25' height='100%25' fill='url(%23o)'/%3e%3c/svg%3e\");background-image:-moz-linear-gradient(top, #2f3742, #282f38 90%);background-image:linear-gradient(180deg, #2f3742, #282f38 90%);filter:progid:DXImageTransform.Microsoft.Gradient(startColorstr='#FF2F3742', endColorstr='#FF272E37')}:root .btn:hover,:root .btn:focus{filter:none}.btn:active{background-color:#3d444d;border-color:#3d444d;background-image:none;filter:none}.social-count{color:#d1d7e0;background-color:#212830;border-color:#3d444d}.social-count:hover,.social-count:focus{color:#4184e4}.octicon-heart{color:#c96198}";

var darkHighContrast = ".btn:focus-visible,.social-count:focus-visible{outline:2px solid #409eff;outline-offset:-2px}.btn{color:#fff;background-color:#262c36;border-color:#b7bdc8;background-image:none;filter:none}.btn:hover,.btn:focus{background-color:#232932;background-position:0 -0.5em;border-color:#b7bdc8;background-image:none;filter:none}.btn:active{background-color:#2f3742;border-color:#b7bdc8}.social-count{color:#fff;background-color:#010409;border-color:#b7bdc8}.social-count:hover,.social-count:focus{color:#5cacff}.octicon-heart{color:#ff90c8}";

var stringify = function (obj, sep, eq, encodeURIComponent) {
  if (sep == null) {
    sep = '&';
  }
  if (eq == null) {
    eq = '=';
  }
  if (encodeURIComponent == null) {
    encodeURIComponent = window.encodeURIComponent;
  }
  var params = [];
  for (var name in obj) {
    var value = obj[name];
    if (value != null) {
      params.push(encodeURIComponent(name) + eq + encodeURIComponent(value));
    }
  }
  return params.join(sep)
};

var parse = function (str, sep, eq, decodeURIComponent) {
  if (decodeURIComponent == null) {
    decodeURIComponent = window.decodeURIComponent;
  }
  var obj = {};
  forEach(str.split(sep), function (entry) {
    if (entry !== '') {
      var ref = entry.split(eq);
      obj[decodeURIComponent(ref[0])] = (ref[1] != null ? decodeURIComponent(ref.slice(1).join(eq)) : undefined);
    }
  });
  return obj
};

var widgetColorSchemes = {
  light: light,
  light_high_contrast: lightHighContrast,
  dark: dark,
  dark_dimmed: darkDimmed,
  dark_high_contrast: darkHighContrast
};

var getColorSchemeMediaQuery = function (systemColorScheme, widgetColorScheme) {
  return '@media(prefers-color-scheme:' + systemColorScheme + '){' + widgetColorSchemes[hasOwnProperty(widgetColorSchemes, widgetColorScheme) ? widgetColorScheme : systemColorScheme] + '}'
};

var getColorScheme = function (declarations) {
  if (declarations == null) {
    return widgetColorSchemes.light
  }

  if (hasOwnProperty(widgetColorSchemes, declarations)) {
    return widgetColorSchemes[declarations]
  }

  var colorSchemes = parse(declarations, ';', ':', function (str) {
    return str.replace(/^[ \t\n\f\r]+|[ \t\n\f\r]+$/g, '')
  });

  return widgetColorSchemes[hasOwnProperty(widgetColorSchemes, colorSchemes['no-preference']) ? colorSchemes['no-preference'] : 'light'] +
    getColorSchemeMediaQuery('light', colorSchemes.light) +
    getColorSchemeMediaQuery('dark', colorSchemes.dark)
};

var data = {
  "comment-discussion": {
    heights: {
      "16": {
        width: 16,
        path: "<path d=\"M1.75 1h8.5c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 10.25 10H7.061l-2.574 2.573A1.458 1.458 0 0 1 2 11.543V10h-.25A1.75 1.75 0 0 1 0 8.25v-5.5C0 1.784.784 1 1.75 1ZM1.5 2.75v5.5c0 .138.112.25.25.25h1a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h3.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25Zm13 2a.25.25 0 0 0-.25-.25h-.5a.75.75 0 0 1 0-1.5h.5c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 14.25 12H14v1.543a1.458 1.458 0 0 1-2.487 1.03L9.22 12.28a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215l2.22 2.22v-2.19a.75.75 0 0 1 .75-.75h1a.25.25 0 0 0 .25-.25Z\"></path>"
      }
    }
  },
  download: {
    heights: {
      "16": {
        width: 16,
        path: "<path d=\"M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z\"></path><path d=\"M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.06l1.97 1.969Z\"></path>"
      }
    }
  },
  eye: {
    heights: {
      "16": {
        width: 16,
        path: "<path d=\"M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.62 1.62 0 0 1 0-1.798c.45-.677 1.367-1.931 2.637-3.022C4.33 2.992 6.019 2 8 2ZM1.679 7.932a.12.12 0 0 0 0 .136c.411.622 1.241 1.75 2.366 2.717C5.176 11.758 6.527 12.5 8 12.5c1.473 0 2.825-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 0 0 0-.136c-.412-.621-1.242-1.75-2.366-2.717C10.824 4.242 9.473 3.5 8 3.5c-1.473 0-2.825.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z\"></path>"
      }
    }
  },
  heart: {
    heights: {
      "16": {
        width: 16,
        path: "<path d=\"m8 14.25.345.666a.75.75 0 0 1-.69 0l-.008-.004-.018-.01a7.152 7.152 0 0 1-.31-.17 22.055 22.055 0 0 1-3.434-2.414C2.045 10.731 0 8.35 0 5.5 0 2.836 2.086 1 4.25 1 5.797 1 7.153 1.802 8 3.02 8.847 1.802 10.203 1 11.75 1 13.914 1 16 2.836 16 5.5c0 2.85-2.045 5.231-3.885 6.818a22.066 22.066 0 0 1-3.744 2.584l-.018.01-.006.003h-.002ZM4.25 2.5c-1.336 0-2.75 1.164-2.75 3 0 2.15 1.58 4.144 3.365 5.682A20.58 20.58 0 0 0 8 13.393a20.58 20.58 0 0 0 3.135-2.211C12.92 9.644 14.5 7.65 14.5 5.5c0-1.836-1.414-3-2.75-3-1.373 0-2.609.986-3.029 2.456a.749.749 0 0 1-1.442 0C6.859 3.486 5.623 2.5 4.25 2.5Z\"></path>"
      }
    }
  },
  "issue-opened": {
    heights: {
      "16": {
        width: 16,
        path: "<path d=\"M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z\"></path><path d=\"M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z\"></path>"
      }
    }
  },
  "mark-github": {
    heights: {
      "16": {
        width: 16,
        path: "<path d=\"M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z\"></path>"
      }
    }
  },
  "package": {
    heights: {
      "16": {
        width: 16,
        path: "<path d=\"m8.878.392 5.25 3.045c.54.314.872.89.872 1.514v6.098a1.75 1.75 0 0 1-.872 1.514l-5.25 3.045a1.75 1.75 0 0 1-1.756 0l-5.25-3.045A1.75 1.75 0 0 1 1 11.049V4.951c0-.624.332-1.201.872-1.514L7.122.392a1.75 1.75 0 0 1 1.756 0ZM7.875 1.69l-4.63 2.685L8 7.133l4.755-2.758-4.63-2.685a.248.248 0 0 0-.25 0ZM2.5 5.677v5.372c0 .09.047.171.125.216l4.625 2.683V8.432Zm6.25 8.271 4.625-2.683a.25.25 0 0 0 .125-.216V5.677L8.75 8.432Z\"></path>"
      }
    }
  },
  play: {
    heights: {
      "16": {
        width: 16,
        path: "<path d=\"M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z\"></path>"
      }
    }
  },
  "repo-forked": {
    heights: {
      "16": {
        width: 16,
        path: "<path d=\"M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z\"></path>"
      }
    }
  },
  "repo-template": {
    heights: {
      "16": {
        width: 16,
        path: "<path d=\"M13.25 8a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-.75a.75.75 0 0 1 0-1.5h.75v-.25a.75.75 0 0 1 .75-.75ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2ZM2.75 8a.75.75 0 0 1 .75.75v.268c.083-.012.166-.018.25-.018h.5a.75.75 0 0 1 0 1.5h-.5a.25.25 0 0 0-.25.25v.75c0 .28.114.532.3.714a.75.75 0 1 1-1.05 1.072A2.495 2.495 0 0 1 2 11.5V8.75A.75.75 0 0 1 2.75 8ZM11 .75a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V1.5h-.75A.75.75 0 0 1 11 .75Zm-5 0A.75.75 0 0 1 6.75 0h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 6 .75Zm0 9A.75.75 0 0 1 6.75 9h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 6 9.75ZM4.992.662a.75.75 0 0 1-.636.848c-.436.063-.783.41-.846.846a.751.751 0 0 1-1.485-.212A2.501 2.501 0 0 1 4.144.025a.75.75 0 0 1 .848.637ZM2.75 4a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 2.75 4Zm10.5 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Z\"></path>"
      }
    }
  },
  star: {
    heights: {
      "16": {
        width: 16,
        path: "<path d=\"M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z\"></path>"
      }
    }
  }
};

var octicon = function (icon, height) {
  icon = toLowerCase(icon).replace(/^octicon-/, '');
  if (!hasOwnProperty(data, icon)) {
    icon = 'mark-github';
  }

  var defaultHeight = height >= 24 && /* istanbul ignore next */ 24 in data[icon].heights ? /* istanbul ignore next */ 24 : 16;

  var svg = data[icon].heights[defaultHeight];

  return '<svg viewBox="0 0 ' + svg.width + ' ' + defaultHeight + '" width="' + (height * svg.width / defaultHeight) + '" height="' + height + '" class="octicon octicon-' + icon + '" aria-hidden="true">' + svg.path + '</svg>'
};

var queues = {};

var fetch = function (url, func) {
  var queue = queues[url] || (queues[url] = []);
  if (queue.push(func) > 1) {
    return
  }

  var callback = dispatchOnce(function () {
    delete queues[url];
    while ((func = queue.shift())) {
      func.apply(null, arguments);
    }
  });

  if (useXHR) {
    var xhr = new XMLHttpRequest();
    onEvent(xhr, 'abort', callback);
    onEvent(xhr, 'error', callback);
    onEvent(xhr, 'load', function () {
      var data;
      try {
        data = JSON.parse(this.responseText);
      } catch (error) {
        callback(error);
        return
      }
      callback(this.status !== 200, data);
    });
    xhr.open('GET', url);
    xhr.send();
  } else {
    var contentWindow = this || window;
    contentWindow._ = function (json) {
      contentWindow._ = null;
      callback(json.meta.status !== 200, json.data);
    };
    var script = createElementInDocument(contentWindow.document)('script', {
      async: true,
      src: url + (url.indexOf('?') !== -1 ? '&' : '?') + 'callback=_'
    });
    var onloadend = /* istanbul ignore next: IE lt 9 */ function () {
      if (contentWindow._) {
        contentWindow._({
          meta: {}
        });
      }
    };
    onEvent(script, 'load', onloadend);
    onEvent(script, 'error', onloadend);
    onceReadyStateChange(script, /de|m/, onloadend);
    contentWindow.document.getElementsByTagName('head')[0].appendChild(script);
  }
};

var render$1 = function (root, options, func) {
  var createElement = createElementInDocument(root.ownerDocument);

  var style = root.appendChild(createElement('style', {
    type: 'text/css'
  }));

  var cssText = buttonsCssText + getColorScheme(options['data-color-scheme']);

  /* istanbul ignore if: IE lt 9 */
  if (style.styleSheet) {
    style.styleSheet.cssText = cssText;
  } else {
    style.appendChild(root.ownerDocument.createTextNode(cssText));
  }

  var isLarge = toLowerCase(options['data-size']) === 'large';

  var btn = createElement('a', {
    className: 'btn',
    href: options.href,
    rel: 'noopener',
    target: '_blank',
    title: options.title || undefined,
    'aria-label': options['aria-label'] || undefined,
    innerHTML: octicon(options['data-icon'], isLarge ? 16 : 14) + '&nbsp;'
  }, [
    createElement('span', {}, [options['data-text'] || ''])
  ]);

  var widget = root.appendChild(createElement('div', {
    className: 'widget' + (isLarge ? ' widget-lg' : '')
  }, [
    btn
  ]));

  var hostname = btn.hostname.replace(/\.$/, '');
  if (('.' + hostname).substring(hostname.length - domain.length) !== ('.' + domain)) {
    btn.removeAttribute('href');
    func(widget);
    return
  }

  var path = (' /' + btn.pathname).split(/\/+/);
  if (((hostname === domain || hostname === 'gist.' + domain) && path[3] === 'archive') ||
    (hostname === domain && path[3] === 'releases' && (path[4] === 'download' || (path[4] === 'latest' && path[5] === 'download'))) ||
    (hostname === 'codeload.' + domain)) {
    btn.target = '_top';
  }

  if (toLowerCase(options['data-show-count']) !== 'true' ||
    hostname !== domain ||
    path[1] === 'marketplace' ||
    path[1] === 'sponsors' ||
    path[1] === 'orgs' ||
    path[1] === 'users' ||
    path[1] === '-') {
    func(widget);
    return
  }

  var href, property;
  if (!path[2] && path[1]) {
    property = 'followers';
    href = '?tab=followers';
  } else if (!path[3] && path[2]) {
    property = 'stargazers_count';
    href = '/stargazers';
  } else if (!path[4] && path[3] === 'subscription') {
    property = 'subscribers_count';
    href = '/watchers';
  } else if (!path[4] && path[3] === 'fork') {
    property = 'forks_count';
    href = '/forks';
  } else if (path[3] === 'issues') {
    property = 'open_issues_count';
    href = '/issues';
  } else {
    func(widget);
    return
  }

  var api = path[2] ? '/repos/' + path[1] + '/' + path[2] : '/users/' + path[1];
  fetch.call(this, apiBaseURL + api, function (error, json) {
    if (!error) {
      var data = json[property];
      widget.appendChild(createElement('a', {
        className: 'social-count',
        href: json.html_url + href,
        rel: 'noopener',
        target: '_blank',
        'aria-label': data + ' ' + property.replace(/_count$/, '').replace('_', ' ').slice(0, data < 2 ? -1 : undefined) + ' on GitHub'
      }, [
        ('' + data).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      ]));
    }
    func(widget);
  });
};

var devicePixelRatio = window.devicePixelRatio || /* istanbul ignore next */ 1;

var ceilPixel = function (px) {
  return (devicePixelRatio > 1 ? Math.ceil(Math.round(px * devicePixelRatio) / devicePixelRatio * 2) / 2 : Math.ceil(px)) || 0
};

var get = function (el) {
  var width = el.offsetWidth;
  var height = el.offsetHeight;
  if (el.getBoundingClientRect) {
    var boundingClientRect = el.getBoundingClientRect();
    width = Math.max(width, ceilPixel(boundingClientRect.width));
    height = Math.max(height, ceilPixel(boundingClientRect.height));
  }
  return [width, height]
};

var set = function (el, size) {
  el.style.width = size[0] + 'px';
  el.style.height = size[1] + 'px';
};

var render = function (options, func) {
  if (options == null || func == null) {
    return
  }
  if (options.getAttribute) {
    options = parseOptions(options);
  }
  if (useShadowDOM) {
    var host = createElement('span');
    render$1(host.attachShadow({ mode: 'closed' }), options, function () {
      func(host);
    });
  } else {
    var iframe = createElement('iframe', {
      src: 'javascript:0',
      title: options.title || undefined,
      allowtransparency: true,
      scrolling: 'no',
      frameBorder: 0
    });
    set(iframe, [0, 0]);
    iframe.style.border = 'none';
    iframe.style.colorScheme = 'light';
    var callback = function () {
      var contentWindow = iframe.contentWindow;
      var body;
      try {
        body = contentWindow.document.body;
      } catch (_) /* istanbul ignore next: IE 11 */ {
        document.body.appendChild(iframe.parentNode.removeChild(iframe));
        return
      }
      offEvent(iframe, 'load', callback);
      render$1.call(contentWindow, body, options, function (widget) {
        var size = get(widget);
        iframe.parentNode.removeChild(iframe);
        onceEvent(iframe, 'load', function () {
          set(iframe, size);
        });
        iframe.src = iframeURL + '#' + (iframe.name = stringify(options));
        func(iframe);
      });
    };
    onEvent(iframe, 'load', callback);
    document.body.appendChild(iframe);
  }
};

export { render };
