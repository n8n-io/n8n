[![NPM version][npm-image]][npm-url]
[![Node.js CI](https://github.com/leizongmin/js-xss/actions/workflows/nodejs.yml/badge.svg)](https://github.com/leizongmin/js-xss/actions/workflows/nodejs.yml)
[![Test coverage][coveralls-image]][coveralls-url]
[![David deps][david-image]][david-url]
[![node version][node-image]][node-url]
[![npm download][download-image]][download-url]
[![npm license][license-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/xss.svg?style=flat-square
[npm-url]: https://npmjs.org/package/xss
[coveralls-image]: https://img.shields.io/coveralls/leizongmin/js-xss.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/leizongmin/js-xss?branch=master
[david-image]: https://img.shields.io/david/leizongmin/js-xss.svg?style=flat-square
[david-url]: https://david-dm.org/leizongmin/js-xss
[node-image]: https://img.shields.io/badge/node.js-%3E=_0.10-green.svg?style=flat-square
[node-url]: http://nodejs.org/download/
[download-image]: https://img.shields.io/npm/dm/xss.svg?style=flat-square
[download-url]: https://npmjs.org/package/xss
[license-image]: https://img.shields.io/npm/l/xss.svg

# 根据白名单过滤 HTML(防止 XSS 攻击)

![xss](https://nodei.co/npm/xss.png?downloads=true&stars=true)

---

`xss`是一个用于对用户输入的内容进行过滤，以避免遭受 XSS 攻击的模块（[什么是 XSS 攻击？](http://baike.baidu.com/view/2161269.htm)）。主要用于论坛、博客、网上商店等等一些可允许用户录入页面排版、格式控制相关的 HTML 的场景，`xss`模块通过白名单来控制允许的标签及相关的标签属性，另外还提供了一系列的接口以便用户扩展，比其他同类模块更为灵活。

**项目主页：** http://jsxss.com

**在线测试：** http://jsxss.com/zh/try.html

---

## 特性

- 白名单控制允许的 HTML 标签及各标签的属性
- 通过自定义处理函数，可对任意标签及其属性进行处理

## 参考资料

- [XSS 与字符编码的那些事儿 ---科普文](http://drops.wooyun.org/tips/689)
- [腾讯实例教程：那些年我们一起学 XSS](http://www.wooyun.org/whitehats/%E5%BF%83%E4%BC%A4%E7%9A%84%E7%98%A6%E5%AD%90)
- [mXSS 攻击的成因及常见种类](http://drops.wooyun.org/tips/956)
- [XSS Filter Evasion Cheat Sheet](https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet)
- [Data URI scheme](http://en.wikipedia.org/wiki/Data_URI_scheme)
- [XSS with Data URI Scheme](http://hi.baidu.com/badzzzz/item/bdbafe83144619c199255f7b)

## 性能（仅作参考）

- xss 模块：22.53 MB/s
- validator@0.3.7 模块的 xss()函数：6.9 MB/s

测试代码参考 benchmark 目录

## 安装

### NPM

```bash
npm install xss
```

### Bower

```bash
bower install xss
```

或者

```bash
bower install https://github.com/leizongmin/js-xss.git
```

## 使用方法

### 在 Node.js 中使用

```javascript
var xss = require("xss");
var html = xss('<script>alert("xss");</script>');
console.log(html);
```

### 在浏览器端使用

Shim 模式（参考文件 `test/test.html`）:

```html
<script src="https://rawgit.com/leizongmin/js-xss/master/dist/xss.js"></script>
<script>
  // 使用函数名 filterXSS，用法一样
  var html = filterXSS('<script>alert("xss");</scr' + "ipt>");
  alert(html);
</script>
```

AMD 模式（参考文件 `test/test_amd.html`）:

```html
<script>
  require.config({
    baseUrl: "./",
    paths: {
      xss: "https://rawgit.com/leizongmin/js-xss/master/dist/xss.js",
    },
    shim: {
      xss: { exports: "filterXSS" },
    },
  });
  require(["xss"], function (xss) {
    var html = xss('<script>alert("xss");</scr' + "ipt>");
    alert(html);
  });
</script>
```

**说明：请勿将 URL https://rawgit.com/leizongmin/js-xss/master/dist/xss.js 用于生产环境。**

### 使用命令行工具来对文件进行 XSS 处理

### 处理文件

可通过内置的 `xss` 命令来对输入的文件进行 XSS 处理。使用方法：

```bash
xss -i <源文件> -o <目标文件>
```

例：

```bash
xss -i origin.html -o target.html
```

### 在线测试

执行以下命令，可在命令行中输入 HTML 代码，并看到过滤后的代码：

```bash
xss -t
```

详细命令行参数说明，请输入 `$ xss -h` 来查看。

## 自定义过滤规则

在调用 `xss()` 函数进行过滤时，可通过第二个参数来设置自定义规则：

```javascript
options = {}; // 自定义规则
html = xss('<script>alert("xss");</script>', options);
```

如果不想每次都传入一个 `options` 参数，可以创建一个 `FilterXSS` 实例（使用这种方法速度更快）：

```
options = {};  // 自定义规则
myxss = new xss.FilterXSS(options);
// 以后直接调用 myxss.process() 来处理即可
html = myxss.process('<script>alert("xss");</script>');
```

`options` 参数的详细说明见下文。

### 白名单

通过 `whiteList` 来指定，格式为：`{'标签名': ['属性1', '属性2']}`。不在白名单上的标签将被过滤，不在白名单上的属性也会被过滤。以下是示例：

```javascript
// 只允许a标签，该标签只允许href, title, target这三个属性
var options = {
  whiteList: {
    a: ["href", "title", "target"],
  },
};
// 使用以上配置后，下面的HTML
// <a href="#" onclick="hello()"><i>大家好</i></a>
// 将被过滤为
// <a href="#">大家好</a>
```

默认白名单参考 `xss.whiteList`。

### 自定义匹配到标签时的处理方法

通过 `onTag` 来指定相应的处理函数。以下是详细说明：

```javascript
function onTag(tag, html, options) {
  // tag是当前的标签名称，比如<a>标签，则tag的值是'a'
  // html是该标签的HTML，比如<a>标签，则html的值是'<a>'
  // options是一些附加的信息，具体如下：
  //   isWhite    boolean类型，表示该标签是否在白名单上
  //   isClosing  boolean类型，表示该标签是否为闭合标签，比如</a>时为true
  //   position        integer类型，表示当前标签在输出的结果中的起始位置
  //   sourcePosition  integer类型，表示当前标签在原HTML中的起始位置
  // 如果返回一个字符串，则当前标签将被替换为该字符串
  // 如果不返回任何值，则使用默认的处理方法：
  //   在白名单上：  通过onTagAttr来过滤属性，详见下文
  //   不在白名单上：通过onIgnoreTag指定，详见下文
}
```

### 自定义匹配到标签的属性时的处理方法

通过 `onTagAttr` 来指定相应的处理函数。以下是详细说明：

```javascript
function onTagAttr(tag, name, value, isWhiteAttr) {
  // tag是当前的标签名称，比如<a>标签，则tag的值是'a'
  // name是当前属性的名称，比如href="#"，则name的值是'href'
  // value是当前属性的值，比如href="#"，则value的值是'#'
  // isWhiteAttr是否为白名单上的属性
  // 如果返回一个字符串，则当前属性值将被替换为该字符串
  // 如果不返回任何值，则使用默认的处理方法
  //   在白名单上：  调用safeAttrValue来过滤属性值，并输出该属性，详见下文
  //   不在白名单上：通过onIgnoreTagAttr指定，详见下文
}
```

### 自定义匹配到不在白名单上的标签时的处理方法

通过 `onIgnoreTag` 来指定相应的处理函数。以下是详细说明：

```javascript
function onIgnoreTag(tag, html, options) {
  // 参数说明与onTag相同
  // 如果返回一个字符串，则当前标签将被替换为该字符串
  // 如果不返回任何值，则使用默认的处理方法（通过escape指定，详见下文）
}
```

### 自定义匹配到不在白名单上的属性时的处理方法

通过 `onIgnoreTagAttr` 来指定相应的处理函数。以下是详细说明：

```javascript
function onIgnoreTagAttr(tag, name, value, isWhiteAttr) {
  // 参数说明与onTagAttr相同
  // 如果返回一个字符串，则当前属性值将被替换为该字符串
  // 如果不返回任何值，则使用默认的处理方法（删除该属性）
}
```

### 自定义 HTML 转义函数

通过 `escapeHtml` 来指定相应的处理函数。以下是默认代码 **（不建议修改）** ：

```javascript
function escapeHtml(html) {
  return html.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
```

### 自定义标签属性值的转义函数

通过 `safeAttrValue` 来指定相应的处理函数。以下是详细说明：

```javascript
function safeAttrValue(tag, name, value) {
  // 参数说明与onTagAttr相同（没有options参数）
  // 返回一个字符串表示该属性值
}
```

### 自定义 CSS 过滤器

如果配置中允许了标签的 `style` 属性，则它的值会通过[cssfilter](https://github.com/leizongmin/js-css-filter) 模块处理。
`cssfilter` 模块包含了一个默认的 CSS 白名单，你可以通过以下的方式配置：

```javascript
myxss = new xss.FilterXSS({
  css: {
    whiteList: {
      position: /^fixed|relative$/,
      top: true,
      left: true,
    },
  },
});
html = myxss.process('<script>alert("xss");</script>');
```

如果不想使用 CSS 过滤器来处理 `style` 属性的内容，可指定 `css` 选项的值为 `false`：

```javascript
myxss = new xss.FilterXSS({
  css: false,
});
```

要获取更多的帮助信息可看这里：https://github.com/leizongmin/js-css-filter

### 快捷配置

#### 去掉不在白名单上的标签

通过 `stripIgnoreTag` 来设置：

- `true`：去掉不在白名单上的标签
- `false`：（默认），使用配置的`escape`函数对该标签进行转义

示例：

当设置 `stripIgnoreTag = true`时，以下代码

```html
code:
<script>
  alert(/xss/);
</script>
```

过滤后将输出

```html
code:alert(/xss/);
```

#### 去掉不在白名单上的标签及标签体

通过 `stripIgnoreTagBody` 来设置：

- `false|null|undefined`：（默认），不特殊处理
- `'*'|true`：去掉所有不在白名单上的标签
- `['tag1', 'tag2']`：仅去掉指定的不在白名单上的标签

示例：

当设置 `stripIgnoreTagBody = ['script']`时，以下代码

```html
code:
<script>
  alert(/xss/);
</script>
```

过滤后将输出

```html
code:
```

#### 去掉 HTML 备注

通过 `allowCommentTag` 来设置：

- `true`：不处理
- `false`：（默认），自动去掉 HTML 中的备注

示例：

当设置 `allowCommentTag = false` 时，以下代码

```html
code:<!-- something -->
END
```

过滤后将输出

```html
code: END
```

## 应用实例

### 允许标签以 data-开头的属性

```javascript
var source = '<div a="1" b="2" data-a="3" data-b="4">hello</div>';
var html = xss(source, {
  onIgnoreTagAttr: function (tag, name, value, isWhiteAttr) {
    if (name.substr(0, 5) === "data-") {
      // 通过内置的escapeAttrValue函数来对属性值进行转义
      return name + '="' + xss.escapeAttrValue(value) + '"';
    }
  },
});

console.log("%s\nconvert to:\n%s", source, html);
```

运行结果：

```html
<div a="1" b="2" data-a="3" data-b="4">hello</div>
convert to:
<div data-a="3" data-b="4">hello</div>
```

### 允许名称以 x-开头的标签

```javascript
var source = "<x><x-1>he<x-2 checked></x-2>wwww</x-1><a>";
var html = xss(source, {
  onIgnoreTag: function (tag, html, options) {
    if (tag.substr(0, 2) === "x-") {
      // 不对其属性列表进行过滤
      return html;
    }
  },
});

console.log("%s\nconvert to:\n%s", source, html);
```

运行结果：

```html
<x
  ><x-1>he<x-2 checked></x-2>wwww</x-1
  ><a>
    convert to: &lt;x&gt;<x-1>he<x-2 checked></x-2>wwww</x-1><a></a></a
></x>
```

### 分析 HTML 代码中的图片列表

```javascript
var source =
  '<img src="img1">a<img src="img2">b<img src="img3">c<img src="img4">d';
var list = [];
var html = xss(source, {
  onTagAttr: function (tag, name, value, isWhiteAttr) {
    if (tag === "img" && name === "src") {
      // 使用内置的friendlyAttrValue函数来对属性值进行转义，可将&lt;这类的实体标记转换成打印字符<
      list.push(xss.friendlyAttrValue(value));
    }
    // 不返回任何值，表示还是按照默认的方法处理
  },
});

console.log("image list:\n%s", list.join(", "));
```

运行结果：

```html
image list: img1, img2, img3, img4
```

### 去除 HTML 标签（只保留文本内容）

```javascript
var source = "<strong>hello</strong><script>alert(/xss/);</script>end";
var html = xss(source, {
  whiteList: {}, // 白名单为空，表示过滤所有标签
  stripIgnoreTag: true, // 过滤所有非白名单标签的HTML
  stripIgnoreTagBody: ["script"], // script标签较特殊，需要过滤标签中间的内容
});

console.log("text: %s", html);
```

运行结果：

```html
text: helloend
```

## 授权协议

```text
Copyright (c) 2012-2018 Zongmin Lei(雷宗民) <leizongmin@gmail.com>
http://ucdok.com

The MIT License

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
