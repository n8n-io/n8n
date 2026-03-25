suite('lunr.Vector', function () {
  var index, val

  var v1 = new lunr.Vector,
      v2 = new lunr.Vector

  for (var i = 0; i < 1000; i++) {
    index = Math.floor(i + Math.random() * 100)
    val = Math.random() * 100
    v1.insert(i, val)
  }

  for (var i = 0; i < 1000; i++) {
    index = Math.floor(i + Math.random() * 100)
    val = Math.random() * 100
    v2.insert(i, val)
  }

  this.add('magnitude', function () {
    v1.magnitude()
  })

  this.add('dot', function () {
    v1.dot(v2)
  })

  this.add('similarity', function () {
    v1.similarity(v2)
  })

})
