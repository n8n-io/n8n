
/*
Copyright Â© 2001-2004 World Wide Web Consortium, 
(Massachusetts Institute of Technology, European Research Consortium 
for Informatics and Mathematics, Keio University). All 
Rights Reserved. This work is distributed under the W3CÂ® Software License [1] in the 
hope that it will be useful, but WITHOUT ANY WARRANTY; without even 
the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 

[1] http://www.w3.org/Consortium/Legal/2002/copyright-software-20021231
*/



   /**
    *  Gets URI that identifies the test.
    *  @return uri identifier of test
    */
function getTargetURI() {
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/html/HTMLSelectElement08";
   }

var docsLoaded = -1000000;
var builder = null;

//
//   This function is called by the testing framework before
//      running the test suite.
//
//   If there are no configuration exceptions, asynchronous
//        document loading is started.  Otherwise, the status
//        is set to complete and the exception is immediately
//        raised when entering the body of the test.
//
function setUpPage() {
   setUpPageStatus = 'running';
   try {
     //
     //   creates test document builder, may throw exception
     //
     builder = createConfiguredBuilder();

      docsLoaded = 0;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      docsLoaded += preload(docRef, "doc", "select");
        
       if (docsLoaded == 1) {
          setUpPageStatus = 'complete';
       }
    } catch(ex) {
    	catchInitializationError(builder, ex);
        setUpPageStatus = 'complete';
    }
}



//
//   This method is called on the completion of 
//      each asychronous load started in setUpTests.
//
//   When every synchronous loaded document has completed,
//      the page status is changed which allows the
//      body of the test to be executed.
function loadComplete() {
    if (++docsLoaded == 1) {
        setUpPageStatus = 'complete';
    }
}


/**
* 
    The options attribute returns a collection of OPTION elements contained
    by this element.

    Retrieve the options attribute from the first SELECT element and
    examine the items of the returned collection. 

* @author NIST
* @author Mary Brady
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-html#ID-30606413
*/
function HTMLSelectElement08() {
   var success;
    if(checkInitialization(builder, "HTMLSelectElement08") != null) return;
    var nodeList;
      var optionsnodeList;
      var testNode;
      var vareas;
      var doc;
      var optionName;
      var voption;
      var result = new Array();

      expectedOptions = new Array();
      expectedOptions[0] = "option";
      expectedOptions[1] = "option";
      expectedOptions[2] = "option";
      expectedOptions[3] = "option";
      expectedOptions[4] = "option";

      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "select");
      nodeList = doc.getElementsByTagName("select");
      assertSize("Asize",3,nodeList);
testNode = nodeList.item(0);
      optionsnodeList = testNode.options;

      for(var indexN65648 = 0;indexN65648 < optionsnodeList.length; indexN65648++) {
      voption = optionsnodeList.item(indexN65648);
      optionName = voption.nodeName;

      result[result.length] = optionName;

	}
   assertEqualsListAutoCase("element", "optionsLink",expectedOptions,result);
       
}




function runTest() {
   HTMLSelectElement08();
}
