const resultContainsDuplicatedColumns = (rowtype) => {
  const columnNames = rowtype.map(rt => rt.name);
  return columnNames.length !== new Set(columnNames).size;
};

function addOverriddenNamesForDuplicatedColumns(rowtype) {

  //Prepare renamed columns for duplicates if row mode was set to 'object_with_renamed_duplicated_columns'
  if (resultContainsDuplicatedColumns(rowtype)) {

    const columnNames = new Set(rowtype.map(el => el.name));
    const quntityOfColumnNames = new Map();

    for (let index = 0; index < rowtype.length; index++) {
      const columnName = rowtype[index].name;
      if (columnName) {
        if (quntityOfColumnNames.has(columnName)) {
          let times = quntityOfColumnNames.get(columnName) + 1;
          let newColumnName = columnName + '_' + times;
          while (columnNames.has(newColumnName)) {
            times += 1;
            newColumnName = columnName + '_' + times;
          }
          quntityOfColumnNames.set(columnName, times);
          rowtype[index].overriddenName = newColumnName;
          columnNames.add(newColumnName);
        } else {
          quntityOfColumnNames.set(columnName, 1);
        }
      }
    }
  }
}
exports.addOverridenNamesForDuplicatedColumns = addOverriddenNamesForDuplicatedColumns;