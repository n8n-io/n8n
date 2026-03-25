import camelize from "./camelize";
import singularize from "./singularize";

export default function classify(tableName) {
  return camelize(singularize(tableName.replace(/.*\./g, "")));
}
