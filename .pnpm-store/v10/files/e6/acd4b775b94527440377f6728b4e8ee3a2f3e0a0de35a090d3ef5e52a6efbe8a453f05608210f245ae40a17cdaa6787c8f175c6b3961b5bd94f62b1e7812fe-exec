// Licensed to the Software Freedom Conservancy (SFC) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The SFC licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

const command = require('../command')
const Account = require('./account')

class Dialog {
  constructor(driver) {
    this._driver = driver
  }

  async title() {
    const result = await this._driver.execute(new command.Command(command.Name.GET_FEDCM_TITLE))

    return result.title
  }

  subtitle() {
    return this._driver.execute(new command.Command(command.Name.GET_FEDCM_TITLE))
  }

  type() {
    return this._driver.execute(new command.Command(command.Name.GET_FEDCM_DIALOG_TYPE))
  }

  async accounts() {
    const result = await this._driver.execute(new command.Command(command.Name.GET_ACCOUNTS))

    const accountArray = []

    result.forEach((account) => {
      const acc = new Account(
        account.accountId,
        account.email,
        account.name,
        account.givenName,
        account.pictureUrl,
        account.idpConfigUrl,
        account.loginState,
        account.termsOfServiceUrl,
        account.privacyPolicyUrl,
      )
      accountArray.push(acc)
    })

    return accountArray
  }

  selectAccount(index) {
    return this._driver.execute(new command.Command(command.Name.SELECT_ACCOUNT).setParameter('accountIndex', index))
  }

  accept() {
    return this._driver.execute(new command.Command(command.Name.CLICK_DIALOG_BUTTON))
  }

  dismiss() {
    return this._driver.execute(new command.Command(command.Name.CANCEL_DIALOG))
  }
}

module.exports = Dialog
