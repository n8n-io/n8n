// Listen for clicks on the browser action icon
browser.browserAction.onClicked.addListener(() => {
  // Open the secondary market URL in a new tab
  browser.tabs.create({
    url: "https://esketit.com/investor/secondary-market"
  });
});
