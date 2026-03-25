'use strict'

module.exports = (req, context) => ({
  ...req,
  path: `/user/${context.user.id}`,
  body: JSON.stringify({
    ...context.user,
    lastName: 'Doe'
  })
})
