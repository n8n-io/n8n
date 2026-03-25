exports.isDml = function (statementTypeId) {
  return (statementTypeId >= 0x3000 && statementTypeId < 0x4000);
};

exports.isInsert = function (statementTypeId) {
  return (statementTypeId === 0x3100);
};

exports.isUpdate = function (statementTypeId) {
  return (statementTypeId === 0x3200);
};

exports.isDelete = function (statementTypeId) {
  return (statementTypeId === 0x3300);
};

exports.isMerge = function (statementTypeId) {
  return (statementTypeId === 0x3400);
};

exports.isMultiTableInsert = function (statementTypeId) {
  return (statementTypeId === 0x3500);
};

exports.isDdl = function (statementTypeId) {
  return (statementTypeId >= 0x6000);
};