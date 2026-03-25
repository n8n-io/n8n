function override(source1, source2) {
  var target = {};
  var key1;
  var key2;
  var item;

  for (key1 in source1) {
    item = source1[key1];

    if (Array.isArray(item)) {
      target[key1] = item.slice(0);
    } else if (typeof item == 'object' && item !== null) {
      target[key1] = override(item, {});
    } else {
      target[key1] = item;
    }
  }

  for (key2 in source2) {
    item = source2[key2];

    if (key2 in target && Array.isArray(item)) {
      target[key2] = item.slice(0);
    } else if (key2 in target && typeof item == 'object' && item !== null) {
      target[key2] = override(target[key2], item);
    } else {
      target[key2] = item;
    }
  }

  return target;
}

module.exports = override;
