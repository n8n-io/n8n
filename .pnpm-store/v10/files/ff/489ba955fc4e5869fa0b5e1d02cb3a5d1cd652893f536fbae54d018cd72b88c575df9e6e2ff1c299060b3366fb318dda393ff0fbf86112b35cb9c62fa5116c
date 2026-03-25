function compareObjects(obj1, obj2, ref = obj1) {
  for (const key in ref) {
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }
  return Object.keys(obj1).length === Object.keys(obj2).length;
}
function unmergeObjects(obj1, obj2) {
  const result = {
    ...obj1
  };
  for (const key in obj2) {
    if (result[key] === obj2[key]) {
      delete result[key];
    }
  }
  return result;
}
function commonObjectProps(item, reference) {
  const result = /* @__PURE__ */ Object.create(null);
  for (const key in reference) {
    if (key in item) {
      result[key] = item[key];
    }
  }
  return result;
}

export { commonObjectProps, compareObjects, unmergeObjects };
