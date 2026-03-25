'use strict';

const readBooleans = (fields, listOfBooleans) => {
  // html forms do not send off at all
  const fieldsWithBooleans = { ...fields };
  listOfBooleans.forEach((key) => {
    fieldsWithBooleans[key] = fields[key] === `on` || fields[key] === true;
  });
  return fieldsWithBooleans;
};

exports.readBooleans = readBooleans;
