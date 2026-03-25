function en(inflector) {
  inflector.plural(/$/, "s");
  inflector.plural(/s$/i, "s");
  inflector.plural(/^(ax|test)is$/i, "$1es");
  inflector.plural(/(octop|vir)us$/i, "$1i");
  inflector.plural(/(octop|vir)i$/i, "$1i");
  inflector.plural(/(alias|status)$/i, "$1es");
  inflector.plural(/(bu)s$/i, "$1ses");
  inflector.plural(/(buffal|tomat)o$/i, "$1oes");
  inflector.plural(/([ti])um$/i, "$1a");
  inflector.plural(/([ti])a$/i, "$1a");
  inflector.plural(/sis$/i, "ses");
  inflector.plural(/(?:([^f])fe|([lr])f)$/i, "$1$2ves");
  inflector.plural(/(hive)$/i, "$1s");
  inflector.plural(/([^aeiouy]|qu)y$/i, "$1ies");
  inflector.plural(/(x|ch|ss|sh)$/i, "$1es");
  inflector.plural(/(matr|vert|ind)(?:ix|ex)$/i, "$1ices");
  inflector.plural(/^(m|l)ouse$/i, "$1ice");
  inflector.plural(/^(m|l)ice$/i, "$1ice");
  inflector.plural(/^(ox)$/i, "$1en");
  inflector.plural(/^(oxen)$/i, "$1");
  inflector.plural(/(quiz)$/i, "$1zes");

  inflector.singular(/s$/i, "");
  inflector.singular(/(ss)$/i, "$1");
  inflector.singular(/(n)ews$/i, "$1ews");
  inflector.singular(/([ti])a$/i, "$1um");
  inflector.singular(
    /((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)(sis|ses)$/i,
    "$1sis"
  );
  inflector.singular(/(^analy)(sis|ses)$/i, "$1sis");
  inflector.singular(/([^f])ves$/i, "$1fe");
  inflector.singular(/(hive)s$/i, "$1");
  inflector.singular(/(tive)s$/i, "$1");
  inflector.singular(/([lr])ves$/i, "$1f");
  inflector.singular(/([^aeiouy]|qu)ies$/i, "$1y");
  inflector.singular(/(s)eries$/i, "$1eries");
  inflector.singular(/(m)ovies$/i, "$1ovie");
  inflector.singular(/(x|ch|ss|sh)es$/i, "$1");
  inflector.singular(/^(m|l)ice$/i, "$1ouse");
  inflector.singular(/(bus)(es)?$/i, "$1");
  inflector.singular(/(o)es$/i, "$1");
  inflector.singular(/(shoe)s$/i, "$1");
  inflector.singular(/(cris|test)(is|es)$/i, "$1is");
  inflector.singular(/^(a)x[ie]s$/i, "$1xis");
  inflector.singular(/(octop|vir)(us|i)$/i, "$1us");
  inflector.singular(/(alias|status)(es)?$/i, "$1");
  inflector.singular(/^(ox)en/i, "$1");
  inflector.singular(/(vert|ind)ices$/i, "$1ex");
  inflector.singular(/(matr)ices$/i, "$1ix");
  inflector.singular(/(quiz)zes$/i, "$1");
  inflector.singular(/(database)s$/i, "$1");

  inflector.irregular("person", "people");
  inflector.irregular("man", "men");
  inflector.irregular("child", "children");
  inflector.irregular("sex", "sexes");
  inflector.irregular("move", "moves");
  inflector.irregular("zombie", "zombies");

  inflector.uncountable(
    "equipment",
    "information",
    "rice",
    "money",
    "species",
    "series",
    "fish",
    "sheep",
    "jeans",
    "police"
  );
}

export default {
  en
};
