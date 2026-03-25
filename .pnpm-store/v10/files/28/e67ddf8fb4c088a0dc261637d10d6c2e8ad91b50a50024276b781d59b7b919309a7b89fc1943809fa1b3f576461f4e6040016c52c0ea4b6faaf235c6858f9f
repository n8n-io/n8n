import "./chunk-KLNSLHAC.js";

// src/resolver.ts
import { toArray, uniq } from "@antfu/utils";
import { camelToKebab } from "@iconify/utils/lib/misc/strings";

// src/core/icon-sets.json
var icon_sets_default = [
  "academicons",
  "akar-icons",
  "ant-design",
  "arcticons",
  "basil",
  "bi",
  "bitcoin-icons",
  "bpmn",
  "brandico",
  "bx",
  "bxl",
  "bxs",
  "bytesize",
  "carbon",
  "cbi",
  "charm",
  "ci",
  "cib",
  "cif",
  "cil",
  "circle-flags",
  "circum",
  "clarity",
  "codicon",
  "covid",
  "cryptocurrency",
  "cryptocurrency-color",
  "dashicons",
  "devicon",
  "devicon-plain",
  "ei",
  "el",
  "emojione",
  "emojione-monotone",
  "emojione-v1",
  "entypo",
  "entypo-social",
  "eos-icons",
  "ep",
  "et",
  "eva",
  "f7",
  "fa",
  "fa-brands",
  "fa-regular",
  "fa-solid",
  "fa6-brands",
  "fa6-regular",
  "fa6-solid",
  "fad",
  "fe",
  "feather",
  "file-icons",
  "flag",
  "flagpack",
  "flat-color-icons",
  "flat-ui",
  "flowbite",
  "fluent",
  "fluent-emoji",
  "fluent-emoji-flat",
  "fluent-emoji-high-contrast",
  "fluent-mdl2",
  "fontelico",
  "fontisto",
  "formkit",
  "foundation",
  "fxemoji",
  "gala",
  "game-icons",
  "geo",
  "gg",
  "gis",
  "gravity-ui",
  "gridicons",
  "grommet-icons",
  "guidance",
  "healthicons",
  "heroicons",
  "heroicons-outline",
  "heroicons-solid",
  "humbleicons",
  "ic",
  "icomoon-free",
  "icon-park",
  "icon-park-outline",
  "icon-park-solid",
  "icon-park-twotone",
  "iconamoon",
  "iconoir",
  "icons8",
  "il",
  "ion",
  "iwwa",
  "jam",
  "la",
  "lets-icons",
  "line-md",
  "logos",
  "ls",
  "lucide",
  "mage",
  "majesticons",
  "maki",
  "map",
  "marketeq",
  "material-symbols",
  "material-symbols-light",
  "mdi",
  "mdi-light",
  "medical-icon",
  "memory",
  "meteocons",
  "mi",
  "mingcute",
  "mono-icons",
  "mynaui",
  "nimbus",
  "nonicons",
  "noto",
  "noto-v1",
  "octicon",
  "oi",
  "ooui",
  "openmoji",
  "oui",
  "pajamas",
  "pepicons",
  "pepicons-pencil",
  "pepicons-pop",
  "pepicons-print",
  "ph",
  "pixelarticons",
  "prime",
  "ps",
  "quill",
  "radix-icons",
  "raphael",
  "ri",
  "si-glyph",
  "simple-icons",
  "simple-line-icons",
  "skill-icons",
  "solar",
  "streamline",
  "streamline-emojis",
  "subway",
  "svg-spinners",
  "system-uicons",
  "tabler",
  "tdesign",
  "teenyicons",
  "token",
  "token-branded",
  "topcoat",
  "twemoji",
  "typcn",
  "uil",
  "uim",
  "uis",
  "uit",
  "uiw",
  "unjs",
  "vaadin",
  "vs",
  "vscode-icons",
  "websymbol",
  "whh",
  "wi",
  "wpf",
  "zmdi",
  "zondicons"
];

// src/resolver.ts
function ComponentsResolver(options = {}) {
  var _a;
  const {
    prefix: rawPrefix = (_a = options.componentPrefix) != null ? _a : "i",
    enabledCollections = icon_sets_default,
    alias = {},
    customCollections = [],
    extension,
    strict = false
  } = options;
  const prefix = rawPrefix ? `${camelToKebab(rawPrefix)}-` : "";
  const ext = extension ? extension.startsWith(".") ? extension : `.${extension}` : "";
  const collections = uniq([
    ...toArray(enabledCollections),
    ...toArray(customCollections),
    ...toArray(Object.keys(alias))
  ]);
  collections.sort((a, b) => b.length - a.length);
  return (name) => {
    let collection;
    let icon;
    if (name.includes(":")) {
      const [iconPrefix, iconSuffix] = name.split(":");
      collection = camelToKebab(iconPrefix);
      if (!collection.startsWith(prefix))
        return;
      const slice = collection.slice(prefix.length);
      const resolvedCollection2 = collections.find((i) => slice === i);
      if (!resolvedCollection2)
        return;
      collection = resolvedCollection2;
      icon = camelToKebab(iconSuffix);
    } else {
      const kebab = camelToKebab(name);
      if (!kebab.startsWith(prefix))
        return;
      const slice = kebab.slice(prefix.length);
      const resolvedCollection2 = collections.find((i) => slice.startsWith(`${i}-`)) || !strict && collections.find((i) => slice.startsWith(i));
      if (!resolvedCollection2)
        return;
      collection = resolvedCollection2;
      icon = slice.slice(resolvedCollection2.length);
    }
    if (icon[0] === "-")
      icon = icon.slice(1);
    if (!icon)
      return;
    const resolvedCollection = alias[collection] || collection;
    if (collections.includes(resolvedCollection))
      return `~icons/${resolvedCollection}/${icon}${ext}`;
  };
}
export {
  ComponentsResolver as default
};
